import { Component, inject, input, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VariantApiService } from '../../../../core/services/variant-api.service';
import type { ProductVariant } from '../../../../core/models/product-variant.model';

@Component({
  selector: 'app-variant-manager',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="vm-header">
      <h3 class="vm-title">Colour Variants</h3>
      <button type="button" class="btn-outline btn-sm" (click)="add()">
        + Add Colour Variant
      </button>
    </div>

    @if (loading()) {
      <div class="vm-loading">Loading variants...</div>
    } @else if (error()) {
      <div class="vm-error">{{ error() }}</div>
    } @else if (variants().length === 0) {
      <div class="vm-empty">
        <p>No colour variants yet.</p>
        <p class="text-muted">Add at least one variant with a primary image and sizes.</p>
      </div>
    } @else {
      <div class="vm-grid">
        @for (v of variants(); track v.id) {
          <div class="vm-card" [class.inactive]="!v.isActive">
            <div class="vm-card-header">
              <span class="vm-colour-swatch" [style.background]="v.colourHex || '#ccc'"></span>
              <strong>{{ v.colourName }}</strong>
              @if (!v.isActive) {
                <span class="badge badge-secondary">Inactive</span>
              }
            </div>
            <div class="vm-card-body">
              <div class="vm-detail"><span class="vm-label">SKU</span><span>{{ v.sku }}</span></div>
              @if (v.flipkartUrl) {
                <div class="vm-detail">
                  <span class="vm-label">Flipkart</span>
                  <a [href]="v.flipkartUrl" target="_blank" rel="noopener">Link</a>
                </div>
              }
              @if (v.images.primary) {
                <img [src]="v.images.primary" alt="" class="vm-thumb" />
              }
              <div class="vm-sizes">
                @for (s of v.sizes; track s.size) {
                  <span class="vm-size-badge" [class.oos]="s.stock === 0">
                    {{ s.size }} {{ s.stock }}
                  </span>
                }
              </div>
              @if (v.isFeatured || v.isBestSeller || v.isNewArrival) {
                <div class="vm-flags">
                  @if (v.isFeatured) { <span class="badge badge-featured">Featured</span> }
                  @if (v.isBestSeller) { <span class="badge badge-best">Bestseller</span> }
                  @if (v.isNewArrival) { <span class="badge badge-new">New</span> }
                </div>
              }
            </div>
            <div class="vm-card-actions">
              <button type="button" class="btn-text" (click)="edit(v)">Edit</button>
              <button type="button" class="btn-text btn-text-danger" (click)="remove(v)">Delete</button>
            </div>
          </div>
        }
      </div>
    }
  `,
  styles: [`
    .vm-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
    .vm-title { margin: 0; font-size: 1.1rem; font-weight: 600; }
    .vm-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem; }
    .vm-card { border: 1px solid var(--border, #e2e8f0); border-radius: 8px; overflow: hidden; background: #fff; }
    .vm-card.inactive { opacity: .55; }
    .vm-card-header { display: flex; align-items: center; gap: .5rem; padding: .75rem 1rem; background: #f8fafc; border-bottom: 1px solid var(--border, #e2e8f0); }
    .vm-colour-swatch { width: 20px; height: 20px; border-radius: 50%; border: 1px solid rgba(0,0,0,.1); flex-shrink: 0; }
    .vm-card-body { padding: .75rem 1rem; }
    .vm-detail { display: flex; justify-content: space-between; font-size: .8rem; margin-bottom: .35rem; }
    .vm-label { color: #64748b; }
    .vm-thumb { width: 100%; aspect-ratio: 1; object-fit: cover; border-radius: 4px; margin: .5rem 0; }
    .vm-sizes { display: flex; flex-wrap: wrap; gap: .35rem; margin-top: .5rem; }
    .vm-size-badge { font-size: .7rem; padding: .2rem .5rem; border-radius: 4px; background: #f1f5f9; }
    .vm-size-badge.oos { opacity: .4; text-decoration: line-through; }
    .vm-flags { display: flex; gap: .35rem; margin-top: .5rem; }
    .vm-card-actions { display: flex; gap: .5rem; padding: .5rem 1rem; border-top: 1px solid var(--border, #e2e8f0); justify-content: flex-end; }
    .vm-loading, .vm-empty, .vm-error { padding: 2rem; text-align: center; color: #64748b; }
  `],
})
export class VariantManagerComponent {
  private readonly api = inject(VariantApiService);
  readonly productId = input.required<string>();
  readonly variants = signal<ProductVariant[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly onAdd = signal<((productId: string) => void) | null>(null);
  readonly onEdit = signal<((variant: ProductVariant) => void) | null>(null);
  readonly onDelete = signal<((variantId: string) => void) | null>(null);

  add(): void { this.onAdd()?.(this.productId()); }
  edit(v: ProductVariant): void { this.onEdit()?.(v); }
  remove(v: ProductVariant): void { this.onDelete()?.(v.id); }
}
