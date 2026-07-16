import { computed, Injectable, inject, signal } from '@angular/core';
import { Product } from '../models/product.model';
import { ProductQueryService } from './product-query.service';

/**
 * Opens instantly with whatever (possibly partial/summary) Product object
 * the caller already has, then fetches the full record via the Product
 * Details API (GET /products/{id}) in the background and swaps it in once
 * resolved — this is what makes "Product Details API" a real, exercised
 * piece of the architecture rather than a no-op. Listing/grid endpoints
 * stay lightweight; only opening Quick View triggers the full-detail fetch.
 */
@Injectable({ providedIn: 'root' })
export class QuickViewService {
  private readonly query = inject(ProductQueryService);

  private readonly _product = signal<Product | null>(null);
  private readonly _detailLoading = signal(false);
  private readonly _detailError = signal<string | null>(null);

  readonly product       = this._product.asReadonly();
  readonly isOpen        = computed(() => this._product() !== null);
  readonly detailLoading = this._detailLoading.asReadonly();
  readonly detailError   = this._detailError.asReadonly();

  open(p: Product): void {
    this._product.set(p);
    void this.loadFullDetail(p.id);
  }

  retryDetail(): void {
    const current = this._product();
    if (current) void this.loadFullDetail(current.id);
  }

  close(): void {
    this._product.set(null);
    this._detailLoading.set(false);
    this._detailError.set(null);
  }

  private async loadFullDetail(id: string): Promise<void> {
    this._detailLoading.set(true);
    this._detailError.set(null);
    try {
      const full = await this.query.getById(id);
      // The modal may have been closed (or switched to a different product) while this was in flight.
      if (this._product()?.id === id) this._product.set(full);
    } catch (err) {
      if (this._product()?.id === id) {
        this._detailError.set(err instanceof Error ? err.message : 'Could not load full product details.');
      }
    } finally {
      if (this._product()?.id === id) this._detailLoading.set(false);
    }
  }
}
