import { Component, inject, OnInit, signal, computed } from '@angular/core';
import {
  FormBuilder, FormArray, FormGroup, ReactiveFormsModule, Validators, AbstractControl,
} from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';

import { ProductApiService }                  from '../../../../core/services/product-api.service';
import { AdminProductInput }                  from '../../../../core/models/product-api.model';
import {
  ProductImageGalleryComponent, GalleryImageState,
} from '../../components/product-image-gallery/product-image-gallery.component';
import { APP_ROUTES }                         from '../../../../core/constants/routes.constants';
import { Product, ProductImage, ProductSize } from '../../../../core/models/product.model';
import { slugify }                            from '../../../../shared/utils/slugify.util';
import {
  validateImageFile, processImageForUpload, CorruptImageError,
} from '../../../../shared/utils/image-processing.util';

interface CategoryOption { id: string; label: string; }

const MAX_IMAGES = 10;

@Component({
  selector:    'app-admin-product-form',
  standalone:  true,
  imports:     [ReactiveFormsModule, RouterLink, ProductImageGalleryComponent],
  templateUrl: './admin-product-form.component.html',
  styleUrl:    './admin-product-form.component.css',
})
export class AdminProductFormComponent implements OnInit {
  private readonly fb     = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route  = inject(ActivatedRoute);
  readonly api             = inject(ProductApiService);

  readonly BASE       = `/${APP_ROUTES.ADMIN}`;
  readonly isEdit     = signal(false);
  readonly saved      = signal(false);
  readonly saving     = signal(false);
  readonly formError  = signal<string | null>(null);
  readonly slugError  = signal<string | null>(null);
  readonly skuError   = signal<string | null>(null);
  private productId   = '';

  readonly maxImages = MAX_IMAGES;

  readonly categories: CategoryOption[] = [
    { id: 'long-kurtas',   label: 'Long Kurtas' },
    { id: 'short-kurtas',  label: 'Short Kurtas' },
    { id: '2-piece-sets',  label: '2-Piece Kurta Sets' },
    { id: '3-piece-sets',  label: '3-Piece Kurta Sets' },
  ];

  private slugTouched     = false;
  private discountTouched = false;

  readonly form = this.fb.group({
    name:               ['', [Validators.required, Validators.minLength(3), Validators.maxLength(200)]],
    slug:               ['', [Validators.required, Validators.pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)]],
    category:           ['long-kurtas', Validators.required],
    subCategory:        [''],
    brand:              ['Vrindaya'],
    description:        [''],
    shortDescription:   [''],
    price:              [0, [Validators.required, Validators.min(0)]],
    mrp:                [0, [Validators.required, Validators.min(0)]],
    discount:           [0, [Validators.min(0), Validators.max(100)]],
    fabric:             [''],
    pattern:            [''],
    fit:                [''],
    sleeve:             [''],
    neck:               [''],
    occasion:           [''],
    color:              [''],
    washCare:           [''],
    sku:                ['', Validators.required],
    tags:               [''],
    featured:           [false],
    newArrival:         [false],
    bestSeller:         [false],
    active:             [true],
    displayOrder:       [0],
    lowStockThreshold:  [null as number | null],
    autoHideWhenOutOfStock: [false],
    flipkartProductUrl: [''],
    flipkartProductId:  [''],
    seoTitle:           [''],
    seoDescription:     [''],
    seoKeywords:        [''],
    sizes:              this.fb.array([] as FormGroup[]),
  });

  readonly images = signal<GalleryImageState[]>([]);
  readonly filledImageCount = computed(() => this.images().filter(i => i.status === 'uploaded').length);

  get f(): { [key: string]: AbstractControl } { return this.form.controls; }
  get sizesArray(): FormArray { return this.form.get('sizes') as FormArray; }

  constructor() {
    this.form.get('name')!.valueChanges.subscribe(name => {
      if (this.slugTouched) return;
      this.form.get('slug')!.setValue(slugify(name ?? ''), { emitEvent: false });
    });

    this.form.get('price')!.valueChanges.subscribe(() => this.recomputeDiscount());
    this.form.get('mrp')!.valueChanges.subscribe(() => this.recomputeDiscount());
  }

  async ngOnInit(): Promise<void> {
    await this.api.ensureLoaded();

    const idParam = this.route.snapshot.paramMap.get('id');

    if (idParam && idParam !== 'new') {
      this.isEdit.set(true);
      this.productId = idParam;

      const p = await this.api.getById(idParam);

      if (p) {
        this.populateForm(p);
      } else {
        this.formError.set('Product not found.');
      }
    } else {
      this.productId = await this.api.generateId();
      this.addSize();
    }
  }

  private recomputeDiscount(): void {
    if (this.discountTouched) return;
    const price = Number(this.form.value.price) || 0;
    const mrp   = Number(this.form.value.mrp)   || 0;
    if (mrp > 0) {
      const pct = Math.round(((mrp - price) / mrp) * 100);
      this.form.get('discount')!.setValue(Math.max(0, Math.min(100, pct)), { emitEvent: false });
    }
  }

  onDiscountInput(): void { this.discountTouched = true; }
  onSlugInput():     void { this.slugTouched = true; }

  /* ── Sizes ── */

  addSize(): void {
    this.sizesArray.push(this.fb.group({
      size:  ['', Validators.required],
      stock: [0, [Validators.required, Validators.min(0)]],
    }));
  }

  removeSize(index: number): void {
    this.sizesArray.removeAt(index);
  }

  /* ── Images ──────────────────────────────────────────────────────────────
   * Pipeline per file: validate (fast, sync) → process client-side (resize/
   * WebP-convert/compress, see image-processing.util.ts) → upload the
   * processed blob under a position-based name ("cover", "image-2", ...).
   * Every file is handled independently (its own try/catch, its own
   * fire-and-forget async chain) so one failure — a corrupt file, a dropped
   * connection — never stops the rest of the batch from processing/uploading.
   * ── */

  addFiles(files: File[]): void {
    const remaining = MAX_IMAGES - this.images().length;
    files.slice(0, remaining).forEach(file => {
      const error = validateImageFile(file);
      const entry: GalleryImageState = {
        localId:    crypto.randomUUID(),
        file,
        fileName:   this.nextAvailableFileName(),
        previewUrl: URL.createObjectURL(file),
        status:     error ? 'error' : 'pending',
        progress:   0,
        error:      error ?? undefined,
      };
      this.images.update(list => [...list, entry]);
      if (!error) void this.processAndUpload(entry.localId);
    });
  }

  /** "cover" for the first image, then "image-2", "image-3", ... — skipping any name already taken by another entry currently in the gallery (including ones loaded from the server — see populateForm). */
  private nextAvailableFileName(): string {
    const used = new Set(this.images().map(i => i.fileName).filter((n): n is string => !!n));
    if (!used.has('cover')) return 'cover';
    let n = 2;
    while (used.has(`image-${n}`)) n++;
    return `image-${n}`;
  }

  private async processAndUpload(localId: string): Promise<void> {
    const entry = this.images().find(i => i.localId === localId);
    if (!entry?.file) return;

    try {
      const processed = await processImageForUpload(entry.file);
      this.applyProcessedPreview(localId, processed);
    } catch (err: unknown) {
      const message = err instanceof CorruptImageError ? err.message : 'Could not process this image. Please try a different file.';
      this.updateImage(localId, { status: 'error', error: message });
      return;
    }

    await this.uploadOne(localId);
  }

  /** Swaps the raw-file preview for the processed (resized + WebP) one and records dimensions/size for the gallery's meta line — runs after processing, before the upload request goes out. */
  private applyProcessedPreview(localId: string, processed: { blob: Blob; previewUrl: string; width: number; height: number; sizeBytes: number }): void {
    const entry = this.images().find(i => i.localId === localId);
    if (entry?.previewUrl.startsWith('blob:')) URL.revokeObjectURL(entry.previewUrl);

    this.updateImage(localId, {
      processedBlob: processed.blob,
      previewUrl:    processed.previewUrl,
      width:         processed.width,
      height:        processed.height,
      sizeBytes:     processed.sizeBytes,
    });
  }

  private async uploadOne(localId: string): Promise<void> {
    const entry = this.images().find(i => i.localId === localId);
    if (!entry?.processedBlob) return;

    this.updateImage(localId, { status: 'uploading', progress: 0, error: undefined });

    try {
      const result = await this.api.uploadImage(this.productId, entry.processedBlob, entry.fileName, percent => {
        this.updateImage(localId, { progress: percent });
      });
      this.updateImage(localId, {
        status: 'uploaded', progress: 100, serverUrl: result.url, publicId: result.publicId, error: undefined,
      });
    } catch (err: unknown) {
      this.updateImage(localId, { status: 'error', error: err instanceof Error ? err.message : 'Upload failed.' });
    }
  }

  /** Re-attempts from wherever the pipeline last stopped — reprocesses from the original file if that's what failed, or just re-uploads the already-processed blob if only the network call failed (no need to redo the resize/compress work). */
  retryImage(localId: string): void {
    const entry = this.images().find(i => i.localId === localId);
    if (entry?.processedBlob) {
      void this.uploadOne(localId);
    } else if (entry?.file) {
      void this.processAndUpload(localId);
    }
  }

  async removeImage(localId: string): Promise<void> {
    const entry = this.images().find(i => i.localId === localId);
    if (entry?.publicId) {
      try { await this.api.deleteImage(this.productId, entry.publicId); } catch { /* best-effort — the save is the source of truth */ }
    }
    if (entry?.previewUrl.startsWith('blob:')) URL.revokeObjectURL(entry.previewUrl);
    this.images.update(list => list.filter(i => i.localId !== localId));
  }

  /** Replaces one gallery slot's file in place — same fileName/position as before, so the re-upload overwrites the same Storage object. */
  async replaceImage(event: { localId: string; file: File }): Promise<void> {
    const { localId, file } = event;
    const error = validateImageFile(file);
    if (error) {
      this.formError.set(error);
      return;
    }

    const previous = this.images().find(i => i.localId === localId);
    this.updateImage(localId, { file, processedBlob: undefined, status: 'pending', error: undefined });

    try {
      const processed = await processImageForUpload(file);
      this.applyProcessedPreview(localId, processed);
      await this.uploadOne(localId);

      const current = this.images().find(i => i.localId === localId);
      if (previous?.publicId && current?.publicId && previous.publicId !== current.publicId) {
        try { await this.api.deleteImage(this.productId, previous.publicId); } catch { /* best-effort cleanup of the now-orphaned object */ }
      }
    } catch (err: unknown) {
      const message = err instanceof CorruptImageError ? err.message : 'Could not process this image. Please try a different file.';
      this.updateImage(localId, { status: 'error', error: message });
    }
  }

  private updateImage(localId: string, patch: Partial<GalleryImageState>): void {
    this.images.update(list => list.map(i => i.localId === localId ? { ...i, ...patch } : i));
  }

  /* ── Populate (edit mode) ── */

  private populateForm(p: Product): void {
    this.form.patchValue({
      name:               p.name,
      slug:               p.slug,
      category:           p.category,
      subCategory:        p.subCategory ?? '',
      brand:              p.brand || 'Vrindaya',
      description:        p.description ?? '',
      shortDescription:   p.shortDescription ?? '',
      price:              p.price,
      mrp:                p.mrp,
      discount:           p.discount,
      fabric:             p.fabric ?? '',
      pattern:            p.pattern ?? '',
      fit:                p.fit ?? '',
      sleeve:             p.sleeve ?? '',
      neck:               p.neck ?? '',
      occasion:           p.occasion ?? '',
      color:              p.color ?? '',
      washCare:           p.washCare ?? '',
      sku:                p.sku,
      tags:               p.tags.join(', '),
      featured:           p.featured,
      newArrival:         p.newArrival,
      bestSeller:         p.bestSeller,
      active:             p.active,
      displayOrder:       p.displayOrder,
      lowStockThreshold:  p.lowStockThreshold ?? null,
      autoHideWhenOutOfStock: p.autoHideWhenOutOfStock,
      flipkartProductUrl: p.flipkartProductUrl ?? '',
      flipkartProductId:  p.flipkartProductId ?? '',
      seoTitle:           p.seoTitle ?? '',
      seoDescription:     p.seoDescription ?? '',
      seoKeywords:        (p.seoKeywords ?? []).join(', '),
    }, { emitEvent: false });

    this.slugTouched     = true;
    this.discountTouched = true;

    this.sizesArray.clear();
    for (const s of p.sizes) {
      this.sizesArray.push(this.fb.group({
        size:  [s.size, Validators.required],
        stock: [s.stock, [Validators.required, Validators.min(0)]],
      }));
    }
    if (this.sizesArray.length === 0) this.addSize();

    // fileName here is a *virtual* position label, not necessarily this
    // image's real Storage filename (older uploads may still be GUID-named)
    // — it only exists so nextAvailableFileName() can avoid colliding with
    // these slots when new images are added in this editing session.
    this.images.set([...p.images].sort((a, b) => a.order - b.order).map((img, index) => ({
      localId:    crypto.randomUUID(),
      fileName:   index === 0 ? 'cover' : `image-${index + 1}`,
      previewUrl: img.url,
      serverUrl:  img.url,
      publicId:       img.publicId,
      status:     'uploaded' as const,
      progress:   100,
    })));
  }

  /* ── Submit ── */

  isInvalid(ctrl: string): boolean {
    const c = this.form.get(ctrl);
    return !!(c?.invalid && c?.touched);
  }

  /** Used by unsavedChangesGuard — true once the user has edited a field and not yet successfully saved. */
  hasUnsavedChanges(): boolean {
    return this.form.dirty && !this.saved();
  }

  private buildImages(): ProductImage[] {
    return this.images()
      .filter(i => i.status === 'uploaded' && i.serverUrl && i.publicId)
      .map((i, order) => ({ url: i.serverUrl!, publicId: i.publicId!, order }));
  }

  async submit(): Promise<void> {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    if (this.sizesArray.length === 0) { this.formError.set('Add at least one size.'); return; }

    if (this.images().some(i => i.status === 'uploading')) {
      this.formError.set('Wait for image uploads to finish before saving.');
      return;
    }
    if (this.images().some(i => i.status === 'error')) {
      this.formError.set('Remove or retry the failed image before saving.');
      return;
    }

    this.formError.set(null);
    this.slugError.set(null);
    this.skuError.set(null);
    this.saving.set(true);

    const v    = this.form.getRawValue();
    const slug = slugify(v.slug ?? '');
    const sku  = (v.sku ?? '').trim().toUpperCase();

    const excludeId = this.isEdit() ? this.productId : undefined;
    if (this.api.existsBySlug(slug, excludeId)) {
      this.slugError.set('This slug is already used by another product.');
      this.saving.set(false);
      return;
    }
    if (this.api.existsBySku(sku, excludeId)) {
      this.skuError.set('This SKU is already used by another product.');
      this.saving.set(false);
      return;
    }

    const images = this.buildImages();
    if (v.active && images.length === 0) {
      this.formError.set('Add at least one image before publishing an active product, or uncheck "Active" to save as a draft.');
      this.saving.set(false);
      return;
    }

    const input: AdminProductInput = {
      ...(this.isEdit() ? {} : { id: this.productId }),
      name:             v.name!.trim(),
      slug,
      category:         v.category!,
      subCategory:      v.subCategory?.trim() || undefined,
      description:      v.description?.trim() || undefined,
      shortDescription: v.shortDescription?.trim() || undefined,
      price:            Number(v.price) || 0,
      mrp:              Number(v.mrp) || 0,
      discount:         Number(v.discount) || 0,
      fabric:           v.fabric?.trim() || undefined,
      pattern:          v.pattern?.trim() || undefined,
      fit:              v.fit?.trim() || undefined,
      sleeve:           v.sleeve?.trim() || undefined,
      neck:             v.neck?.trim() || undefined,
      occasion:         v.occasion?.trim() || undefined,
      color:            v.color?.trim() || undefined,
      washCare:         v.washCare?.trim() || undefined,
      sizes:            this.sizesArray.getRawValue() as ProductSize[],
      sku,
      tags:             (v.tags ?? '').split(',').map(t => t.trim()).filter(Boolean),
      featured:         !!v.featured,
      newArrival:       !!v.newArrival,
      bestSeller:       !!v.bestSeller,
      active:           !!v.active,
      displayOrder:     Number(v.displayOrder) || 0,
      lowStockThreshold: v.lowStockThreshold ?? undefined,
      autoHideWhenOutOfStock: !!v.autoHideWhenOutOfStock,
      images,
      brand:              v.brand?.trim() || undefined,
      flipkartProductUrl: v.flipkartProductUrl?.trim() || undefined,
      flipkartProductId:  v.flipkartProductId?.trim() || undefined,
      seoTitle:           v.seoTitle?.trim() || undefined,
      seoDescription:     v.seoDescription?.trim() || undefined,
      seoKeywords:        (v.seoKeywords ?? '').split(',').map(t => t.trim()).filter(Boolean),
    };

    try {
      if (this.isEdit()) {
        await this.api.update(this.productId, input);
      } else {
        await this.api.create(input);
      }
      this.saved.set(true);
      this.saving.set(false);
      setTimeout(() => this.router.navigate([this.BASE + '/products']), 800);
    } catch (err: unknown) {
      this.formError.set(err instanceof Error ? err.message : 'Failed to save product.');
      this.saving.set(false);
    }
  }
}
