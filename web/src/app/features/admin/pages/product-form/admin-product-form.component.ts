import { Component, inject, OnInit, signal, computed, isDevMode, ChangeDetectionStrategy } from '@angular/core';
import {
  FormBuilder, ReactiveFormsModule, Validators, AbstractControl,
} from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { ProductApiService }                  from '../../../../core/services/product-api.service';
import { AdminProductInput, VariantRequest }  from '../../../../core/models/product-api.model';
import { APP_ROUTES }                         from '../../../../core/constants/routes.constants';
import { Product, ProductImage }              from '../../../../core/models/product.model';
import { slugify }                            from '../../../../shared/utils/slugify.util';
import { validateImageFile, processImageForUpload } from '../../../../shared/utils/image-processing.util';

interface CategoryOption { id: string; label: string; }
interface SizeRow { size: string; stock: number; }

interface VariantGalleryImage {
  url:      string | null;
  publicId: string | null;
  file:     File | null;
  preview:  string | null;
  uploading: boolean;
  error:     string | null;
  isCover:   boolean;
  order:      number;
}

interface VariantFormData {
  id: string;
  colourName: string;
  colourHex: string;
  sku: string;
  purchaseCost: number | null;
  packagingCost: number | null;
  flipkartCommission: number | null;
  shippingCharges: number | null;
  marketingCost: number | null;
  otherCharges: number | null;
  desiredProfit: number | null;
  flipkartUrl: string;
  isActive: boolean;
  sizes: SizeRow[];
  gallery: VariantGalleryImage[];
  isExisting: boolean;
  isDeleted: boolean;
  pricing: VariantPricingSummary;
}

interface VariantPricingSummary {
  totalCost: number;
  sellingPrice: number;
  profitMargin: number;
  roi: number;
}

const DEFAULT_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'];

@Component({
  selector:    'app-admin-product-form',
  standalone:  true,
  imports:     [CommonModule, FormsModule, ReactiveFormsModule, RouterLink],
  templateUrl: './admin-product-form.component.html',
  styleUrl:    './admin-product-form.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
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
  readonly productId  = signal<string>('');

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

  readonly hasAtLeastOneVariant = computed(() => this.activeVariantCount() > 0);

  readonly canSave = computed(() => this.hasAtLeastOneVariant() && !this.saving());

  readonly variantMinSellingPrice = computed(() => {
    let min = Infinity;
    for (const v of this.variants()) {
      if (v.isDeleted) continue;
      const sp = v.pricing.sellingPrice;
      if (sp > 0 && sp < min) min = sp;
    }
    return min === Infinity ? null : min;
  });

  readonly variantMaxSellingPrice = computed(() => {
    let max = -Infinity;
    for (const v of this.variants()) {
      if (v.isDeleted) continue;
      const sp = v.pricing.sellingPrice;
      if (sp > 0 && sp > max) max = sp;
    }
    return max === -Infinity ? null : max;
  });

  readonly priceRangeDisplay = computed(() => {
    const min = this.variantMinSellingPrice();
    const max = this.variantMaxSellingPrice();
    if (min === null && max === null) return '—';
    if (min === max) return `₹${min!.toFixed(0)}`;
    return `₹${min!.toFixed(0)} – ₹${max!.toFixed(0)}`;
  });

  variantTotalStock(v: VariantFormData): number {
    return v.sizes.reduce((sum, s) => sum + (s.stock || 0), 0);
  }

  get f(): { [key: string]: AbstractControl } { return this.form.controls; }

  constructor() {
    this.form.get('name')!.valueChanges.pipe(
      takeUntilDestroyed(),
    ).subscribe(name => {
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
      const p = await this.api.getById(productId);
      if (!p || !('variants' in p)) return;
      const apiVariants = (p as any).variants ?? [];
      if (!apiVariants?.length) return;
      this.variants.set(apiVariants.map((v: any) => {
        const base = {
          id: v.id,
          colourName: v.colourName,
          colourHex: v.colourHex || '#000000',
          sku: v.sku,
          purchaseCost: v.purchaseCost ?? null,
          packagingCost: v.packagingCost ?? null,
          flipkartCommission: v.flipkartCommission ?? null,
          shippingCharges: v.shippingCharges ?? null,
          marketingCost: v.marketingCost ?? null,
          otherCharges: v.otherCharges ?? null,
          desiredProfit: v.desiredProfit ?? null,
          flipkartUrl: v.flipkartUrl || '',
          isActive: v.isActive,
          sizes: v.sizes.map((s: any) => ({ size: s.size, stock: s.stock })),
          gallery: buildVariantGallery(v.images),
          isExisting: true,
          isDeleted: false,
          pricing: { totalCost: 0, sellingPrice: 0, profitMargin: 0, roi: 0 },
        } as VariantFormData;
        return this.recalcPricing(base);
      }));
      this.expandedVariantIds.set(new Set(apiVariants.map((v: any) => v.id)));
    } catch {
      // silent
    }
  }

  createVariant(): void {
    const id = crypto.randomUUID();
    this.variants.update(list => [...list, {
      id,
      colourName: '',
      colourHex: '#000000',
      sku: '',
      purchaseCost: null,
      packagingCost: null,
      flipkartCommission: null,
      shippingCharges: null,
      marketingCost: null,
      otherCharges: null,
      desiredProfit: null,
      flipkartUrl: '',
      isActive: true,
      sizes: DEFAULT_SIZES.map(s => ({ size: s, stock: 0 })),
      gallery: [],
      isExisting: false,
      isDeleted: false,
      pricing: { totalCost: 0, sellingPrice: 0, profitMargin: 0, roi: 0 },
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
      if (n.has(id)) { n.delete(id); } else { n.add(id); }
      return n;
    });
  }

  duplicateVariant(id: string): void {
    const source = this.variants().find(v => v.id === id);
    if (!source) return;
    const newId = crypto.randomUUID();
    this.variants.update(list => [...list, {
      ...source,
      id: newId,
      colourName: source.colourName + ' (copy)',
      sku: source.sku ? source.sku + '-COPY' : '',
      isExisting: false,
      isDeleted: false,
      gallery: source.gallery.map(g => ({ ...g, file: null, preview: null, uploading: false, error: null })),
    }]);
    this.expandedVariantIds.update(s => new Set(s).add(newId));
  }

  trackByVariantId(_: number, v: VariantFormData): string { return v.id; }

  trackByGalleryIndex(_: number, img: VariantGalleryImage): string {
    return img.publicId ?? img.preview ?? `${_}`;
  }

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

  /* ── Variant Gallery Upload ── */

  onVariantFilesSelected(event: Event, variantId: string): void {
    const files = Array.from((event.target as HTMLInputElement).files ?? []);
    if (!files.length) return;
    void this.uploadVariantGalleryImages(files, variantId);
  }

  onVariantGalleryDrop(event: DragEvent, variantId: string): void {
    event.preventDefault();
    event.stopPropagation();
    const files = Array.from(event.dataTransfer?.files ?? []);
    if (!files.length) return;
    void this.uploadVariantGalleryImages(files, variantId);
  }

  onVariantGalleryDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
  }

  private async uploadVariantGalleryImages(files: File[], variantId: string): Promise<void> {
    for (const file of files) {
      const error = validateImageFile(file);
      if (error) { this.formError.set(error); continue; }

      const preview = URL.createObjectURL(file);
      const galleryEntry: VariantGalleryImage = {
        url: null, publicId: null, file, preview,
        uploading: true, error: null, isCover: false,
        order: 0,
      };

      this.variants.update(list => list.map(v => {
        if (v.id !== variantId) return v;
        const gallery = [...v.gallery, galleryEntry];
        // First image becomes cover
        if (gallery.length === 1) gallery[0].isCover = true;
        return { ...v, gallery };
      }));

      try {
        const processed = await processImageForUpload(file);
        const slotKey = 'gallery';
        const res = await firstValueFrom(
          this.api.uploadVariantImage(this.productId(), variantId, slotKey,
            new File([processed.blob], file.name, { type: 'image/webp' }))
        );

        this.variants.update(list => list.map(v => {
          if (v.id !== variantId) return v;
          return {
            ...v,
            gallery: v.gallery.map(g =>
              g.preview === preview
                ? { ...g, url: res.url, publicId: res.publicId, file: null, uploading: false, preview: null }
                : g
            ),
          };
        }));
        URL.revokeObjectURL(preview);
      } catch (err: unknown) {
        this.variants.update(list => list.map(v => {
          if (v.id !== variantId) return v;
          return {
            ...v,
            gallery: v.gallery.map(g =>
              g.preview === preview
                ? { ...g, uploading: false, error: err instanceof Error ? err.message : 'Upload failed' }
                : g
            ),
          };
        }));
      }
    }
  }

  removeVariantGalleryImage(variantId: string, index: number): void {
    this.variants.update(list => list.map(v => {
      if (v.id !== variantId) return v;
      const img = v.gallery[index];
      if (img?.publicId) {
        firstValueFrom(this.api.deleteVariantImage(this.productId(), variantId, img.publicId)).catch(() => {});
      }
      if (img?.preview?.startsWith('blob:')) URL.revokeObjectURL(img.preview);
      let gallery = v.gallery.filter((_, i) => i !== index);
      // Ensure first image is cover if cover was removed
      if (gallery.length > 0 && !gallery.some(g => g.isCover)) {
        gallery = gallery.map((g, i) => ({ ...g, isCover: i === 0 }));
      }
      return { ...v, gallery };
    }));
  }

  setVariantCover(variantId: string, index: number): void {
    this.variants.update(list => list.map(v => {
      if (v.id !== variantId) return v;
      return {
        ...v,
        gallery: v.gallery.map((g, i) => ({ ...g, isCover: i === index })),
      };
    }));
  }

  moveVariantGalleryImage(variantId: string, from: number, to: number): void {
    const variant = this.variants().find(v => v.id === variantId);
    if (!variant || to < 0 || to >= variant.gallery.length) return;
    this.variants.update(list => list.map(v => {
      if (v.id !== variantId) return v;
      const gallery = [...v.gallery];
      const [moved] = gallery.splice(from, 1);
      gallery.splice(to, 0, moved);
      return { ...v, gallery };
    }));
  }

  triggerVariantGalleryInput(variantId: string): void {
    const el = document.getElementById('vg-input-' + variantId) as HTMLInputElement;
    el?.click();
  }

  /* ── Pricing calculation ── */

  private recalcPricing(v: VariantFormData): VariantFormData {
    const purchase = v.purchaseCost ?? 0;
    const packaging = v.packagingCost ?? 0;
    const commission = v.flipkartCommission ?? 0;
    const shipping = v.shippingCharges ?? 0;
    const marketing = v.marketingCost ?? 0;
    const other = v.otherCharges ?? 0;
    const profit = v.desiredProfit ?? 0;
    const totalCost = purchase + packaging + commission + shipping + marketing + other;
    const sellingPrice = totalCost + profit;
    const profitMargin = sellingPrice > 0 ? (profit / sellingPrice) * 100 : 0;
    const roi = totalCost > 0 ? (profit / totalCost) * 100 : 0;
    return {
      ...v,
      pricing: { totalCost, sellingPrice, profitMargin, roi },
    };
  }

  onVariantPricingChange(v: VariantFormData): void {
    this.variants.update(list => list.map(item => {
      if (item.id !== v.id) return item;
      return this.recalcPricing(item);
    }));
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
  }

  /* ── Submit ── */

  isInvalid(ctrl: string): boolean {
    const c = this.form.get(ctrl);
    return !!(c?.invalid && c?.touched);
  }

  hasUnsavedChanges(): boolean {
    return this.form.dirty && !this.saved();
  }

  async submit(): Promise<void> {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }

    if (!this.hasAtLeastOneVariant()) {
      this.formError.set('Please add at least one colour variant before saving.');
      return;
    }

    // Validate each variant has required fields
    for (const v of this.variants()) {
      if (v.isDeleted) continue;

      if (!v.colourName?.trim()) {
        this.formError.set(`Enter a colour name for "${v.colourName || 'a variant'}" before saving.`);
        return;
      }

      if (!v.gallery.some(g => g.url)) {
        this.formError.set(`Add at least one image to "${v.colourName}" before saving.`);
        return;
      }

      for (const img of v.gallery) {
        if (img.uploading) {
          this.formError.set(`Wait for "${v.colourName}" image upload to finish.`);
          return;
        }
        if (img.error && !img.url) {
          this.formError.set(`Fix or remove the failed image for "${v.colourName}" before saving.`);
          return;
        }
      }

      if (!v.sizes.some(s => (s.stock || 0) > 0)) {
        this.formError.set(`Add at least one size with quantity for "${v.colourName}" before saving.`);
        return;
      }

      if (!(v.purchaseCost ?? 0)) {
        this.formError.set(`Enter a purchase cost for "${v.colourName}" before saving.`);
        return;
      }

      if (!(v.desiredProfit ?? 0)) {
        this.formError.set(`Enter a desired profit for "${v.colourName}" before saving.`);
        return;
      }
    }

    this.formError.set(null);
    this.slugError.set(null);
    this.saving.set(true);

    if (isDevMode()) console.log('[Step 2] Product Form', this.form.value);
    const formVals      = this.form.getRawValue();
    const slug          = slugify(formVals.slug ?? '');
    const excludeId     = this.isEdit() ? this.productId() : undefined;

    if (this.api.existsBySlug(slug, excludeId)) {
      this.slugError.set('This slug is already used by another product.');
      this.saving.set(false);
      return;
    }

    const variants: VariantRequest[] = this.variants()
      .filter(v => !v.isDeleted)
      .map(v => {
        const coverEntry = v.gallery.find(g => g.isCover) ?? v.gallery[0];
        const galleryWithUrl = v.gallery.filter(g => g.url);
        return {
          id: v.isExisting ? v.id : undefined,
          colourName: v.colourName,
          colourHex: v.colourHex || undefined,
          sku: v.sku,
          sellingPrice: v.pricing.sellingPrice || undefined,
          mrp: v.pricing.sellingPrice || undefined,
          purchaseCost: v.purchaseCost ?? undefined,
          packagingCost: v.packagingCost ?? undefined,
          flipkartCommission: v.flipkartCommission ?? undefined,
          shippingCharges: v.shippingCharges ?? undefined,
          marketingCost: v.marketingCost ?? undefined,
          otherCharges: v.otherCharges ?? undefined,
          desiredProfit: v.desiredProfit ?? undefined,
          flipkartUrl: v.flipkartUrl || undefined,
          displayOrder: 0,
          isActive: v.isActive,
          sizes: v.sizes.filter(s => s.stock > 0).map(s => ({ size: s.size, stock: s.stock })),
          images: {
            primary: coverEntry?.url ? { url: coverEntry.url, publicId: coverEntry.publicId ?? undefined } : undefined,
            front: undefined,
            back: undefined,
            left: undefined,
            right: undefined,
            closeup: undefined,
            gallery: galleryWithUrl.map(g => ({ url: g.url!, publicId: g.publicId ?? undefined })),
          },
        };
      });

    const input: AdminProductInput = {
      ...(this.isEdit() ? {} : { id: this.productId() }),
      name:             formVals.name!.trim(),
      slug,
      category:         formVals.category!,
      subCategory:      formVals.subCategory?.trim() || undefined,
      description:      formVals.description?.trim() || undefined,
      shortDescription: formVals.shortDescription?.trim() || undefined,
      fabric:           formVals.fabric?.trim() || undefined,
      washCare:         formVals.washCare?.trim() || undefined,
      tags:             (formVals.tags ?? '').split(',').map(t => t.trim()).filter(Boolean),
      featured:         !!formVals.featured,
      newArrival:       !!formVals.newArrival,
      bestSeller:       !!formVals.bestSeller,
      active:           !!formVals.active,
      displayOrder:     Number(formVals.displayOrder) || 0,
      lowStockThreshold: formVals.lowStockThreshold ?? undefined,
      autoHideWhenOutOfStock: !!formVals.autoHideWhenOutOfStock,
      images: [],
      brand:              formVals.brand?.trim() || undefined,
      seoTitle:           formVals.seoTitle?.trim() || undefined,
      seoDescription:     formVals.seoDescription?.trim() || undefined,
      seoKeywords:        (formVals.seoKeywords ?? '').split(',').map(t => t.trim()).filter(Boolean),
      variants,
    };

    if (isDevMode()) {
      console.log('[Step 2] input.variants[0].flipkartUrl:', input.variants?.[0]?.flipkartUrl);
      console.log('[Step 2] All variants flipkartUrl:', input.variants?.map(v => ({ id: v.id, flipkartUrl: v.flipkartUrl })));
    }
    try {
      if (this.isEdit()) {
        await this.api.update(this.productId(), input);
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

/* ── Standalone helper ── */

function buildVariantGallery(images: any): VariantGalleryImage[] {
  if (!images) return [];

  const gallery: VariantGalleryImage[] = [];

  const seen = new Set<string>();

  for (const key of ['primary', 'front', 'back', 'left', 'right', 'closeup']) {
    const slot = images[key];
    if (!slot) continue;
    const url = typeof slot === 'string' ? slot : slot?.url;
    if (url && !seen.has(url)) {
      seen.add(url);
      gallery.push({
        url,
        publicId: typeof slot === 'string' ? null : (slot?.publicId ?? null),
        file: null, preview: url,
        uploading: false, error: null, isCover: gallery.length === 0,
        order: gallery.length,
      });
    }
  }

  const extra = images.gallery ?? [];
  for (const item of extra) {
    const url = typeof item === 'string' ? item : item?.url;
    if (url && !seen.has(url)) {
      seen.add(url);
      gallery.push({
        url,
        publicId: typeof item === 'string' ? null : (item?.publicId ?? null),
        file: null, preview: url,
        uploading: false, error: null, isCover: gallery.length === 0,
        order: gallery.length,
      });
    }
  }

  return gallery;
}