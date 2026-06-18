import { Component, inject, signal, computed } from '@angular/core';
import { RouterLink }                          from '@angular/router';
import { CommonModule }                        from '@angular/common';
import { AdminProductService }                 from '../../services/admin-product.service';
import { APP_ROUTES }                          from '../../../../core/constants/routes.constants';
import { Product }                             from '../../../../core/models/product.model';

@Component({
  selector:    'app-admin-product-list',
  standalone:  true,
  imports:     [RouterLink, CommonModule],
  templateUrl: './admin-product-list.component.html',
  styleUrl:    './admin-product-list.component.css',
})
export class AdminProductListComponent {
  private readonly _sortField = signal<'id' | 'name' | 'price' | 'category'>('id');

  readonly svc  = inject(AdminProductService);
  readonly BASE = `/${APP_ROUTES.ADMIN}`;

  readonly searchQuery    = signal('');
  readonly categoryFilter = signal('all');
  readonly sortField      = this._sortField.asReadonly();
  readonly sortAsc        = signal(false);
  readonly deleteId       = signal<number | null>(null);
  readonly importError    = signal<string | null>(null);

  readonly categories = ['all', 'long-kurtas', 'short-kurtas', '2-piece-sets', '3-piece-sets'];

  readonly filteredProducts = computed(() => {
    const q   = this.searchQuery().trim().toLowerCase();
    const cat = this.categoryFilter();
    const sf  = this.sortField();

    let list = this.svc.products().filter(p => {
      const matchQ   = !q || p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q);
      const matchCat = cat === 'all' || p.categoryId === cat;
      return matchQ && matchCat;
    });

    list = [...list].sort((a, b) => {
      let cmp = 0;
      if (sf === 'name')          cmp = a.name.localeCompare(b.name);
      else if (sf === 'price')    cmp = a.price - b.price;
      else if (sf === 'category') cmp = a.category.localeCompare(b.category);
      else                        cmp = a.id - b.id;
      return this.sortAsc() ? cmp : -cmp;
    });

    return list;
  });

  setSort(field: 'id' | 'name' | 'price' | 'category'): void {
    if (this._sortField() === field) { this.sortAsc.update(v => !v); }
    else { this._sortField.set(field); this.sortAsc.set(true); }
  }

  confirmDelete(id: number): void { this.deleteId.set(id); }
  cancelDelete():            void { this.deleteId.set(null); }

  doDelete(): void {
    const id = this.deleteId();
    if (id !== null) { this.svc.deleteProduct(id); this.deleteId.set(null); }
  }

  duplicate(id: number): void { this.svc.duplicateProduct(id); }

  export(): void { this.svc.exportProducts(); }

  async onImportFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file  = input.files?.[0];
    if (!file) return;
    this.importError.set(null);
    try {
      await this.svc.importProducts(file);
    } catch (err: unknown) {
      this.importError.set(
        err instanceof Error ? err.message : 'Import failed — please check the file format.',
      );
    } finally {
      input.value = '';
    }
  }

  trackById(_: number, p: Product): number { return p.id; }
}
