import { Component, inject, model, computed, signal, ChangeDetectionStrategy } from '@angular/core';
import { ProductApiService } from '../../../../core/services/product-api.service';
import { Product } from '../../../../core/models/product.model';

/**
 * Search-and-select product picker with reorder — reused by the admin's
 * Featured Collection, Trending Collection, and New Arrivals override
 * screens (all three are "an ordered list of admin-picked product ids").
 * Reads from ProductApiService's already-loaded full admin catalog — no
 * separate fetch.
 */
@Component({
  selector:    'app-product-picker',
  standalone:  true,
  templateUrl: './product-picker.component.html',
  styleUrl:    './product-picker.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductPickerComponent {
  private readonly productApi = inject(ProductApiService);

  /** Ordered product ids — two-way bound by the parent form. */
  readonly selectedIds = model.required<string[]>();

  readonly searchQuery = signal('');

  readonly selectedProducts = computed(() => {
    const byId = new Map(this.productApi.products().map(p => [p.id, p]));
    return this.selectedIds()
      .map(id => byId.get(id))
      .filter((p): p is Product => !!p);
  });

  readonly searchResults = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    if (!q) return [];
    const selected = new Set(this.selectedIds());
    return this.productApi.products()
      .filter(p => !selected.has(p.id) && !p.deleted)
      .filter(p => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q))
      .slice(0, 8);
  });

  constructor() {
    void this.productApi.ensureLoaded();
  }

  add(id: string): void {
    this.selectedIds.update(list => [...list, id]);
    this.searchQuery.set('');
  }

  remove(id: string): void {
    this.selectedIds.update(list => list.filter(x => x !== id));
  }

  moveLeft(index: number):  void { this.move(index, index - 1); }
  moveRight(index: number): void { this.move(index, index + 1); }

  private move(from: number, to: number): void {
    if (to < 0 || to >= this.selectedIds().length) return;
    this.selectedIds.update(list => {
      const copy = [...list];
      const [item] = copy.splice(from, 1);
      copy.splice(to, 0, item);
      return copy;
    });
  }

  trackById(_: number, p: Product): string { return p.id; }
}
