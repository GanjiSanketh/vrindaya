import { Component, inject, input, signal, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { VariantApiService } from '../../../../core/services/variant-api.service';
import type { ProductVariant } from '../../../../core/models/product-variant.model';

const DEFAULT_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'];

@Component({
  selector: 'app-variant-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="vf-overlay" (click)="close()"></div>
    <div class="vf-drawer">
      <div class="vf-header">
        <h3>{{ editing() ? 'Edit' : 'Add' }} Colour Variant</h3>
        <button type="button" class="btn-close" (click)="close()">&times;</button>
      </div>

      <div class="vf-body">
        <div class="vf-field">
          <label class="vf-label">Colour Name *</label>
          <input class="vf-input" [(ngModel)]="form.colourName" placeholder="e.g. Teal" />
        </div>

        <div class="vf-field">
          <label class="vf-label">Colour</label>
          <div class="vf-colour-row">
            <input type="color" class="vf-colour-picker" [(ngModel)]="form.colourHex" />
            <input class="vf-input" [(ngModel)]="form.colourHex" placeholder="#000000" maxlength="7" />
          </div>
        </div>

        <div class="vf-row">
          <div class="vf-field">
            <label class="vf-label">SKU *</label>
            <input class="vf-input" [(ngModel)]="form.sku" placeholder="e.g. KT-001-TEAL" />
          </div>
          <div class="vf-field">
            <label class="vf-label">Display Order</label>
            <input type="number" class="vf-input" [(ngModel)]="form.displayOrder" />
          </div>
        </div>

        <div class="vf-field">
          <label class="vf-label">Flipkart URL</label>
          <input class="vf-input" [(ngModel)]="form.flipkartUrl" placeholder="https://flipkart.com/..." />
        </div>

        <fieldset class="vf-section">
          <legend>Status & Flags</legend>
          <div class="vf-check-grid">
            <label class="vf-check"><input type="checkbox" [(ngModel)]="form.isActive" /> Active</label>
            <label class="vf-check"><input type="checkbox" [(ngModel)]="form.isFeatured" /> Featured</label>
            <label class="vf-check"><input type="checkbox" [(ngModel)]="form.isBestSeller" /> Best Seller</label>
            <label class="vf-check"><input type="checkbox" [(ngModel)]="form.isNewArrival" /> New Arrival</label>
          </div>
        </fieldset>

        <fieldset class="vf-section">
          <legend>Images</legend>
          <div class="vf-img-grid">
            @for (slot of imageSlots; track slot.key) {
              <div class="vf-img-slot">
                <label>{{ slot.label }}</label>
                @if (getImage(slot.key)) {
                  <img [src]="getImage(slot.key)" class="vf-img-preview" />
                  <button type="button" class="btn-text btn-text-danger btn-xs" (click)="clearImage(slot.key)">Remove</button>
                }
                <input type="file" accept="image/*" (change)="uploadImage($event, slot.key)" />
              </div>
            }
          </div>
        </fieldset>

        <fieldset class="vf-section">
          <legend>Sizes * <span class="text-muted">(at least one required)</span></legend>
          <div class="vf-sizes-grid">
            @for (s of form.sizes; track s.size) {
              <div class="vf-size-row">
                <span class="vf-size-name">{{ s.size }}</span>
                <input type="number" class="vf-input vf-stock-input" [(ngModel)]="s.stock" min="0" placeholder="Stock" />
              </div>
            }
          </div>
        </fieldset>
      </div>

      <div class="vf-footer">
        <button type="button" class="btn-outline" (click)="close()">Cancel</button>
        <button type="button" class="btn-primary" (click)="save()" [disabled]="!isValid()">
          {{ saving() ? 'Saving...' : (editing() ? 'Update Variant' : 'Add Variant') }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    .vf-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.4); z-index: 1040; }
    .vf-drawer { position: fixed; top: 0; right: 0; width: 520px; max-width: 100vw; height: 100vh; background: #fff; z-index: 1050; display: flex; flex-direction: column; box-shadow: -4px 0 24px rgba(0,0,0,.12); }
    .vf-header { display: flex; justify-content: space-between; align-items: center; padding: 1rem 1.5rem; border-bottom: 1px solid var(--border, #e2e8f0); }
    .vf-header h3 { margin: 0; font-size: 1.05rem; }
    .vf-body { flex: 1; overflow-y: auto; padding: 1.5rem; }
    .vf-footer { display: flex; gap: .75rem; justify-content: flex-end; padding: 1rem 1.5rem; border-top: 1px solid var(--border, #e2e8f0); }
    .vf-field { margin-bottom: 1rem; }
    .vf-label { display: block; font-size: .8rem; font-weight: 600; margin-bottom: .35rem; color: #334155; }
    .vf-input { width: 100%; padding: .5rem .75rem; border: 1px solid var(--border, #e2e8f0); border-radius: 6px; font-size: .875rem; }
    .vf-input:focus { outline: none; border-color: var(--gold, #b8860b); box-shadow: 0 0 0 2px rgba(184,134,11,.15); }
    .vf-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .vf-colour-row { display: flex; gap: .5rem; align-items: center; }
    .vf-colour-picker { width: 44px; height: 38px; border: 1px solid var(--border, #e2e8f0); border-radius: 6px; padding: 2px; cursor: pointer; }
    .vf-section { border: 1px solid var(--border, #e2e8f0); border-radius: 8px; padding: 1rem; margin-bottom: 1rem; }
    .vf-section legend { font-size: .85rem; font-weight: 600; padding: 0 .5rem; color: #334155; }
    .vf-check-grid { display: grid; grid-template-columns: 1fr 1fr; gap: .5rem; }
    .vf-check { display: flex; align-items: center; gap: .5rem; font-size: .85rem; cursor: pointer; }
    .vf-img-grid { display: grid; grid-template-columns: 1fr 1fr; gap: .75rem; }
    .vf-img-slot { border: 1px dashed var(--border, #e2e8f0); border-radius: 6px; padding: .75rem; text-align: center; }
    .vf-img-slot label { font-size: .75rem; font-weight: 600; display: block; margin-bottom: .5rem; text-transform: uppercase; letter-spacing: .05em; color: #64748b; }
    .vf-img-preview { width: 100%; aspect-ratio: 1; object-fit: cover; border-radius: 4px; margin-bottom: .35rem; }
    .vf-img-slot input[type=file] { font-size: .75rem; margin-top: .35rem; }
    .vf-sizes-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: .5rem; }
    .vf-size-row { display: flex; align-items: center; gap: .35rem; }
    .vf-size-name { font-size: .85rem; font-weight: 600; min-width: 32px; color: #334155; }
    .vf-stock-input { width: 100%; padding: .35rem .5rem; text-align: center; }
    .btn-xs { font-size: .7rem; padding: .15rem .5rem; }
  `],
})
export class VariantFormComponent {
  private readonly api = inject(VariantApiService);

  readonly editing = signal(false);
  readonly saving = signal(false);
  readonly productId = input.required<string>();
  readonly saved = output<ProductVariant>();
  readonly closed = output<void>();

  readonly imageSlots = [
    { key: 'primary', label: 'Primary *' },
    { key: 'front', label: 'Front' },
    { key: 'back', label: 'Back' },
    { key: 'left', label: 'Left' },
    { key: 'right', label: 'Right' },
    { key: 'closeup', label: 'Closeup' },
  ];

  private uploadedImages: Record<string, string> = {};

  form = {
    colourName: '',
    colourHex: '#000000',
    sku: '',
    sellingPrice: null as number | null,
    mrp: null as number | null,
    flipkartUrl: '',
    displayOrder: 0,
    isActive: true,
    isFeatured: false,
    isBestSeller: false,
    isNewArrival: false,
    sizes: DEFAULT_SIZES.map(s => ({ size: s, stock: 0 })),
  };

  private editVariant: ProductVariant | null = null;

  openForAdd(): void {
    this.editing.set(false);
    this.editVariant = null;
    this.form = {
      colourName: '',
      colourHex: '#000000',
      sku: '',
      sellingPrice: null,
      mrp: null,
      flipkartUrl: '',
      displayOrder: 0,
      isActive: true,
      isFeatured: false,
      isBestSeller: false,
      isNewArrival: false,
      sizes: DEFAULT_SIZES.map(s => ({ size: s, stock: 0 })),
    };
    this.uploadedImages = {};
  }

  openForEdit(variant: ProductVariant): void {
    this.editing.set(true);
    this.editVariant = variant;
    this.form = {
      colourName: variant.colourName,
      colourHex: variant.colourHex || '#000000',
      sku: variant.sku,
      sellingPrice: variant.sellingPrice ?? null,
      mrp: variant.mrp ?? null,
      flipkartUrl: variant.flipkartUrl || '',
      displayOrder: variant.displayOrder,
      isActive: variant.isActive,
      isFeatured: variant.isFeatured,
      isBestSeller: variant.isBestSeller,
      isNewArrival: variant.isNewArrival,
      sizes: DEFAULT_SIZES.map(s => {
        const existing = variant.sizes.find(vs => vs.size === s);
        return { size: s, stock: existing?.stock ?? 0 };
      }),
    };
    this.uploadedImages = {};
    if (variant.images.primary) this.uploadedImages['primary'] = variant.images.primary;
    if (variant.images.front) this.uploadedImages['front'] = variant.images.front;
    if (variant.images.back) this.uploadedImages['back'] = variant.images.back;
    if (variant.images.left) this.uploadedImages['left'] = variant.images.left;
    if (variant.images.right) this.uploadedImages['right'] = variant.images.right;
    if ((variant.images as any).closeup) this.uploadedImages['closeup'] = (variant.images as any).closeup;
  }

  getImage(slot: string): string | null {
    return this.uploadedImages[slot] || null;
  }

  clearImage(slot: string): void {
    delete this.uploadedImages[slot];
  }

  async uploadImage(event: Event, slot: string): Promise<void> {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const productId = this.productId();
    const tempId = '__temp__';
    try {
      const res = await firstValueFrom(this.api.uploadVariantImage(productId, tempId, slot, file));
      if (res) this.uploadedImages[slot] = res.url;
    } catch {
      const localUrl = URL.createObjectURL(file);
      this.uploadedImages[slot] = localUrl;
    }
  }

  isValid(): boolean {
    return this.form.colourName.trim().length > 0
      && this.form.sku.trim().length > 0
      && this.form.sizes.some(s => s.stock > 0);
  }

  async save(): Promise<void> {
    if (!this.isValid() || this.saving()) return;
    this.saving.set(true);
    try {
      const payload = {
        colourName: this.form.colourName,
        colourHex: this.form.colourHex || null,
        sku: this.form.sku,
        sellingPrice: this.form.sellingPrice,
        mrp: this.form.mrp,
        flipkartUrl: this.form.flipkartUrl || null,
        displayOrder: this.form.displayOrder,
        isActive: this.form.isActive,
        isFeatured: this.form.isFeatured,
        isBestSeller: this.form.isBestSeller,
        isNewArrival: this.form.isNewArrival,
        sizes: this.form.sizes.filter(s => s.stock > 0).map(s => ({ size: s.size, stock: s.stock })),
        images: {
          primary: this.uploadedImages['primary'] || null,
          front: this.uploadedImages['front'] || null,
          back: this.uploadedImages['back'] || null,
          left: this.uploadedImages['left'] || null,
          right: this.uploadedImages['right'] || null,
          closeup: this.uploadedImages['closeup'] || null,
          gallery: [],
        },
      };

      if (this.editing() && this.editVariant) {
        const updated = await firstValueFrom(this.api.updateVariant(this.editVariant.id, payload));
        if (updated) this.saved.emit(updated);
      } else {
        const created = await firstValueFrom(this.api.createVariant(this.productId(), payload));
        if (created) this.saved.emit(created);
      }
      this.close();
    } finally {
      this.saving.set(false);
    }
  }

  close(): void {
    this.closed.emit();
  }
}
