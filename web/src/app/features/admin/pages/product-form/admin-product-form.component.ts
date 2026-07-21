import { Component, inject, OnInit, signal, computed } from '@angular/core';
import {
  FormBuilder, FormArray, FormGroup, ReactiveFormsModule, Validators, AbstractControl,
} from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { ProductApiService }                  from '../../../../core/services/product-api.service';
import { VariantApiService }                  from '../../../../core/services/variant-api.service';
import { AdminProductInput }                  from '../../../../core/models/product-api.model';
import { ProductImageGalleryComponent, GalleryImageState } from '../../components/product-image-gallery/product-image-gallery.component';
import { APP_ROUTES }                         from '../../../../core/constants/routes.constants';
import { Product, ProductImage, ProductSize } from '../../../../core/models/product.model';
import type { ProductVariant }               from '../../../../core/models/product-variant.model';
import { slugify }                            from '../../../../shared/utils/slugify.util';
import {
  validateImageFile, processImageForUpload, CorruptImageError,
} from '../../../../shared/utils/image-processing.util';

interface CategoryOption { id: string; label: string; }
interface SizeRow { size: string; stock: number; }
interface VariantImageSlot { key: string; label: string; }

interface VariantFormData {
  id: string;
  colourName: string;
  colourHex: string;
  sku: string;
  sellingPrice: number | null;
  mrp: number | null;
  flipkartUrl: string;
  isActive: boolean;
  sizes: SizeRow[];
  images: Record<string, { url: string | null; publicId: string | null; file: File | null; preview: string | null; uploading: boolean; error: string | null }>;
  isExisting: boolean;
  isDeleted: boolean;
}

const MAX_IMAGES = 10;
const VARIANT_IMAGE_SLOTS: VariantImageSlot[] = [
  { key: 'primary', label: 'Primary Image' },
  { key: 'front', label: 'Front' },
  { key: 'back', label: 'Back' },
  { key: 'left', label: 'Left' },
  { key: 'right', label: 'Right' },
  { key: 'closeup', label: 'Detail Closeup' },
];
const DEFAULT_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'];

@Component({
  selector:    'app-admin-product-form',
  standalone:  true,
  imports:     [CommonModule, FormsModule, ReactiveFormsModule, RouterLink, ProductImageGalleryComponent],
  templateUrl: './admin-product-form.component.html',
  styleUrl:    './admin-product-form.component.css',
})
export class AdminProductFormComponent implements OnInit {
  private readonly fb     = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route  = inject(ActivatedRoute);
  readonly api             = inject(ProductApiService);
  readonly variantApi      = inject(VariantApiService);

  readonly BASE       = `/${APP_ROUTES.ADMIN}`;
  readonly isEdit     = signal(false);
  readonly saved      = signal(false);
  readonly saving     = signal(false);
  readonly formError  = signal<string | null>(null);
  readonly slugError  = signal<string | null>(null);
  readonly skuError   = signal<string | null>(null);
  readonly productId  = signal<string>('');
  readonly maxImages  = MAX_IMAGES;
  readonly imageSlots = VARIANT_IMAGE_SLOTS;

  readonly expandedVariantIds = signal<Set<string>>(new Set());

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
    fabric:             [''],
    washCare:           [''],
    sizeChart:          [''],
    tags:               [''],
    featured:           [false],
    newArrival:         [false],
    bestSeller:         [false],
    active:             [true],
    displayOrder:       [0],
    lowStockThreshold:  [null as number | null],
    autoHideWhenOutOfStock: [false],
    seoTitle:           [''],
    seoDescription:     [''],
    seoKeywords:        [''],
  });

  readonly images = signal<GalleryImageState[]>([]);
  readonly filledImageCount = computed(() => this.images().filter(i => i.status === 'uploaded').length);

  readonly variants = signal<VariantFormData[]>([]);

  readonly totalStock = computed(() => {
    let total = 0;
    for (const v of this.variants()) {
      if (v.isDeleted) continue;
      for (const s of v.sizes) total += s.stock;
    }
    return total;
  });

  readonly activeVariantCount = computed(() => this.variants().filter(v => !v.isDeleted).length);

  get f(): { [key: string]: AbstractControl } { return this.form.controls; }

  constructor() {
    this.form.get('name')!.valueChanges.subscribe(name => {
      if (this.slugTouched) return;
      this.form.get('slug')!.setValue(slugify(name ?? ''), { emitEvent: false });
    });
  }

  onSlugInput(): void {
    this.slugTouched = true;
  }

  async ngOnInit(): Promise<void> {
    await this.api.ensureLoaded();

    const idParam = this.route.snapshot.paramMap.get('id');

    if (idParam && idParam !== 'new') {
      this.isEdit.set(true);
      this.productId.set(idParam);
      const p = await this.api.getById(idParam);
      if (p) {
        this.populateForm(p);
        await this.loadVariants(idParam);
      } else {
        this.formError.set('Product not found.');
      }
    } else {
      this.productId.set(await this.api.generateId());
    }
  }

  private async loadVariants(productId: string): Promise<void> {
    try {
      const variants = await firstValueFrom(this.variantApi.getVariants(productId));
      if (!variants?.length) return;
      this.variants.set(variants.map(v => ({
        id: v.id,
        colourName: v.colourName,
        colourHex: v.colourHex || '#000000',
        sku: v.sku,
        sellingPrice: v.sellingPrice,
        mrp: v.mrp,
        flipkartUrl: v.flipkartUrl || '',
        isActive: v.isActive,
        sizes: v.sizes.map(s => ({ size: s.size, stock: s.stock })),
        images: Object.fromEntries(VARIANT_IMAGE_SLOTS.map(slot => [
          slot.key,
          {
            url: (v.images as any)[slot.key] || null,
            publicId: null,
            file: null,
            preview: (v.images as any)[slot.key] || null,
            uploading: false,
            error: null,
          },
        ])),
        isExisting: true,
        isDeleted: false,
      })));
      // Expand all by default
      this.expandedVariantIds.set(new Set(variants.map(v => v.id)));
    } catch {
      // silent
    }
  }

  /* ── Image helpers ── */

  private createEmptyImageState(): Record<string, { url: string | null; publicId: string | null; file: File | null; preview: string | null; uploading: boolean; error: string | null }> {
    return Object.fromEntries(VARIANT_IMAGE_SLOTS.map(slot => [
      slot.key,
      { url: null, publicId: null, file: null, preview: null, uploading: false, error: null },
    ]));
  }

  createVariant(): void {
    const id = crypto.randomUUID();
    this.variants.update(list => [...list, {
      id,
      colourName: '',
      colourHex: '#000000',
      sku: '',
      sellingPrice: null,
      mrp: null,
      flipkartUrl: '',
      isActive: true,
      sizes: DEFAULT_SIZES.map(s => ({ size: s, stock: 0 })),
      images: this.createEmptyImageState(),
      isExisting: false,
      isDeleted: false,
    }]);
    this.expandedVariantIds.update(s => new Set(s).add(id));
  }

  removeVariant(id: string): void {
    this.variants.update(list => list.map(v => v.id === id ? { ...v, isDeleted: true } : v));
    this.expandedVariantIds.update(s => { const n = new Set(s); n.delete(id); return n; });
  }

  toggleVariant(id: string): void {
    this.expandedVariantIds.update(s => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  trackByVariantId(_: number, v: VariantFormData): string { return v.id; }
  trackBySize(_: number, s: SizeRow): string { return s.size; }

  addSize(variantId: string): void {
    this.variants.update(list => list.map(v => {
      if (v.id !== variantId) return v;
      const nextNum = v.sizes.length + 1;
      return { ...v, sizes: [...v.sizes, { size: `Size ${nextNum}`, stock: 0 }] };
    }));
  }

  removeSize(variantId: string, sizeIdx: number): void {
    this.variants.update(list => list.map(v => {
      if (v.id !== variantId) return v;
      return { ...v, sizes: v.sizes.filter((_, i) => i !== sizeIdx) };
    }));
  }

  /* ── Variant Image Upload ── */

  async onVariantImageSelected(event: Event, variantId: string, slotKey: string): Promise<void> {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    const error = validateImageFile(file);
    if (error) { this.formError.set(error); return; }

    // Show local preview
    const preview = URL.createObjectURL(file);
    this.updateVariantImage(variantId, slotKey, { file, preview, uploading: true, error: null });

    try {
      const processed = await processImageForUpload(file);
      // Need a temp variant ID for the folder path if this is a new variant
      const folderVariantId = variantId;
      const res = await firstValueFrom(
        this.variantApi.uploadVariantImage(this.productId(), folderVariantId, slotKey, new File([processed.blob], file.name, { type: 'image/webp' }))
      );
      this.updateVariantImage(variantId, slotKey, {
        url: res.url,
        publicId: res.publicId,
        uploading: false,
        error: null,
      });
    } catch (err: unknown) {
      this.updateVariantImage(variantId, slotKey, {
        uploading: false,
        error: err instanceof Error ? err.message : 'Upload failed',
      });
    }
  }

  removeVariantImage(variantId: string, slotKey: string): void {
    const v = this.variants().find(x => x.id === variantId);
    const img = v?.images[slotKey];
    if (img?.publicId && v) {
      this.variantApi.deleteVariantImage(this.productId(), variantId, img.publicId).subscribe({ error: () => {} });
    }
    if (img?.preview?.startsWith('blob:')) URL.revokeObjectURL(img.preview);
    this.updateVariantImage(variantId, slotKey, { url: null, publicId: null, file: null, preview: null, uploading: false, error: null });
  }

  private updateVariantImage(variantId: string, slotKey: string, patch: Partial<{ url: string | null; publicId: string | null; file: File | null; preview: string | null; uploading: boolean; error: string | null }>): void {
    this.variants.update(list => list.map(v => {
      if (v.id !== variantId) return v;
      const images = { ...v.images, [slotKey]: { ...v.images[slotKey], ...patch } };
      return { ...v, images };
    }));
  }

  /* ── Product Image Gallery (same as before) ── */

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
      const result = await this.api.uploadImage(this.productId(), entry.processedBlob, entry.fileName, percent => {
        this.updateImage(localId, { progress: percent });
      });
      this.updateImage(localId, {
        status: 'uploaded', progress: 100, serverUrl: result.url, publicId: result.publicId, error: undefined,
      });
    } catch (err: unknown) {
      this.updateImage(localId, { status: 'error', error: err instanceof Error ? err.message : 'Upload failed.' });
    }
  }

  retryImage(localId: string): void {
    const entry = this.images().find(i => i.localId === localId);
    if (entry?.processedBlob) { void this.uploadOne(localId); }
    else if (entry?.file) { void this.processAndUpload(localId); }
  }

  async removeImage(localId: string): Promise<void> {
    const entry = this.images().find(i => i.localId === localId);
    if (entry?.publicId) {
      try { await this.api.deleteImage(this.productId(), entry.publicId); } catch { /* best-effort */ }
    }
    if (entry?.previewUrl.startsWith('blob:')) URL.revokeObjectURL(entry.previewUrl);
    this.images.update(list => list.filter(i => i.localId !== localId));
  }

  async replaceImage(event: { localId: string; file: File }): Promise<void> {
    const { localId, file } = event;
    const error = validateImageFile(file);
    if (error) { this.formError.set(error); return; }
    const previous = this.images().find(i => i.localId === localId);
    this.updateImage(localId, { file, processedBlob: undefined, status: 'pending', error: undefined });
    try {
      const processed = await processImageForUpload(file);
      this.applyProcessedPreview(localId, processed);
      await this.uploadOne(localId);
      const current = this.images().find(i => i.localId === localId);
      if (previous?.publicId && current?.publicId && previous.publicId !== current.publicId) {
        try { await this.api.deleteImage(this.productId(), previous.publicId); } catch { /* best-effort */ }
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
      fabric:             p.fabric ?? '',
      washCare:           p.washCare ?? '',
      sizeChart:          (p as any).sizeChart ?? '',
      tags:               p.tags.join(', '),
      featured:           p.featured,
      newArrival:         p.newArrival,
      bestSeller:         p.bestSeller,
      active:             p.active,
      displayOrder:       p.displayOrder,
      lowStockThreshold:  p.lowStockThreshold ?? null,
      autoHideWhenOutOfStock: p.autoHideWhenOutOfStock,
      seoTitle:           p.seoTitle ?? '',
      seoDescription:     p.seoDescription ?? '',
      seoKeywords:        (p.seoKeywords ?? []).join(', '),
    }, { emitEvent: false });

    this.slugTouched     = true;
    this.discountTouched = true;

    this.images.set([...p.images].sort((a, b) => a.order - b.order).map((img, index) => ({
      localId:    crypto.randomUUID(),
      fileName:   index === 0 ? 'cover' : `image-${index + 1}`,
      previewUrl: img.url,
      serverUrl:  img.url,
      publicId:   img.publicId,
      status:     'uploaded' as const,
      progress:   100,
    })));
  }

  /* ── Submit ── */

  isInvalid(ctrl: string): boolean {
    const c = this.form.get(ctrl);
    return !!(c?.invalid && c?.touched);
  }

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

    // Check product images
    if (this.images().some(i => i.status === 'uploading')) {
      this.formError.set('Wait for product image uploads to finish before saving.');
      return;
    }
    if (this.images().some(i => i.status === 'error')) {
      this.formError.set('Remove or retry the failed product image before saving.');
      return;
    }

    // Check variant images
    for (const v of this.variants()) {
      if (v.isDeleted) continue;
      for (const slot of VARIANT_IMAGE_SLOTS) {
        const img = v.images[slot.key];
        if (img?.uploading) {
          this.formError.set(`Wait for "${v.colourName || 'a variant'}" — ${slot.label} upload to finish.`);
          return;
        }
        if (img?.error && !img.url) {
          this.formError.set(`Fix or remove the failed image for "${v.colourName || 'a variant'}" — ${slot.label}.`);
          return;
        }
      }
    }

    this.formError.set(null);
    this.slugError.set(null);
    this.saving.set(true);

    const formVals      = this.form.getRawValue();
    const slug          = slugify(formVals.slug ?? '');
    const excludeId     = this.isEdit() ? this.productId() : undefined;

    if (this.api.existsBySlug(slug, excludeId)) {
      this.slugError.set('This slug is already used by another product.');
      this.saving.set(false);
      return;
    }

    const images = this.buildImages();
    if (formVals.active && images.length === 0) {
      this.formError.set('Add at least one product image before publishing, or uncheck "Active" to save as a draft.');
      this.saving.set(false);
      return;
    }

    const input: AdminProductInput = {
      ...(this.isEdit() ? {} : { id: this.productId() }),
      name:             formVals.name!.trim(),
      slug,
      category:         formVals.category!,
      subCategory:      formVals.subCategory?.trim() || undefined,
      description:      formVals.description?.trim() || undefined,
      shortDescription: formVals.shortDescription?.trim() || undefined,
      price:            0,
      mrp:              0,
      discount:         0,
      fabric:           formVals.fabric?.trim() || undefined,
      washCare:         formVals.washCare?.trim() || undefined,
      sizes:            [],
      sku:              '',
      tags:             (formVals.tags ?? '').split(',').map(t => t.trim()).filter(Boolean),
      featured:         !!formVals.featured,
      newArrival:       !!formVals.newArrival,
      bestSeller:       !!formVals.bestSeller,
      active:           !!formVals.active,
      displayOrder:     Number(formVals.displayOrder) || 0,
      lowStockThreshold: formVals.lowStockThreshold ?? undefined,
      autoHideWhenOutOfStock: !!formVals.autoHideWhenOutOfStock,
      images,
      brand:              formVals.brand?.trim() || undefined,
      seoTitle:           formVals.seoTitle?.trim() || undefined,
      seoDescription:     formVals.seoDescription?.trim() || undefined,
      seoKeywords:        (formVals.seoKeywords ?? '').split(',').map(t => t.trim()).filter(Boolean),
      color:              undefined,
      flipkartProductUrl: undefined,
      flipkartProductId:  undefined,
    };

    try {
      // Step 1: Save product
      if (this.isEdit()) {
        await this.api.update(this.productId(), input);
      } else {
        await this.api.create(input);
      }

      // Step 2: Save variants
      const activeVariants = this.variants().filter(v => !v.isDeleted);
      for (const v of activeVariants) {
        if (v.isExisting) {
          // Update existing variant
          const updatePayload = {
            colourName: v.colourName,
            colourHex: v.colourHex || null,
            sku: v.sku,
            sellingPrice: v.sellingPrice,
            mrp: v.mrp,
            flipkartUrl: v.flipkartUrl || null,
            displayOrder: 0,
            isActive: v.isActive,
            isFeatured: false,
            isBestSeller: false,
            isNewArrival: false,
            sizes: v.sizes.filter(s => s.stock > 0).map(s => ({ size: s.size, stock: s.stock })),
            images: {
              primary: v.images['primary']?.url || null,
              front: v.images['front']?.url || null,
              back: v.images['back']?.url || null,
              left: v.images['left']?.url || null,
              right: v.images['right']?.url || null,
              closeup: v.images['closeup']?.url || null,
              gallery: [] as string[],
            },
          };
          await firstValueFrom(this.variantApi.updateVariant(v.id, updatePayload));
        } else {
          // Create new variant
          const createPayload = {
            colourName: v.colourName,
            colourHex: v.colourHex || null,
            sku: v.sku,
            sellingPrice: v.sellingPrice,
            mrp: v.mrp,
            flipkartUrl: v.flipkartUrl || null,
            displayOrder: 0,
            isActive: v.isActive,
            isFeatured: false,
            isBestSeller: false,
            isNewArrival: false,
            sizes: v.sizes.filter(s => s.stock > 0).map(s => ({ size: s.size, stock: s.stock })),
          };
          await firstValueFrom(this.variantApi.createVariant(this.productId(), createPayload));
        }
      }

      // Step 3: Handle deleted variants
      for (const v of this.variants()) {
        if (!v.isDeleted || !v.isExisting) continue;
        await firstValueFrom(this.variantApi.deleteVariant(v.id));
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
