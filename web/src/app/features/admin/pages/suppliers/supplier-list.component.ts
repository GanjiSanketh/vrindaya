import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { SupplierService } from '../../services/supplier.service';
import { Supplier, SupplierSortField } from '../../models/supplier.model';
import { APP_ROUTES } from '../../../../core/constants/routes.constants';

@Component({
  selector:    'app-supplier-list',
  standalone:  true,
  imports:     [FormsModule, RouterLink],
  templateUrl: './supplier-list.component.html',
  styleUrl:    './supplier-list.component.css',
})
export class SupplierListComponent {
  private readonly svc = inject(SupplierService);
  readonly BASE = `/${APP_ROUTES.ADMIN}/suppliers`;

  readonly suppliers = signal<Supplier[]>([]);
  readonly loading   = signal(true);
  readonly error     = signal<string | null>(null);
  readonly hasNext     = signal(false);
  readonly hasPrevious = signal(false);

  readonly searchTerm    = signal('');
  readonly statusFilter  = signal<'' | 'active' | 'inactive'>('');
  readonly sortBy        = signal<SupplierSortField>('companyName');
  readonly sortDescending = signal(false);

  readonly busyId       = signal<string | null>(null);
  readonly actionError  = signal<string | null>(null);

  private currentCursor: string | null = null;
  private nextCursor: string | null = null;
  private history: (string | null)[] = [];

  constructor() {
    void this.load();
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const activeOnly = this.statusFilter() === '' ? undefined : this.statusFilter() === 'active';
      const page = await this.svc.getAll(
        this.currentCursor, 20, this.searchTerm().trim() || undefined, activeOnly,
        this.sortBy(), this.sortDescending(),
      );
      this.suppliers.set(page.items);
      this.nextCursor = page.nextCursor;
      this.hasNext.set(!!page.nextCursor);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Could not load suppliers.');
    } finally {
      this.loading.set(false);
    }
  }

  async applyFilters(): Promise<void> {
    this.currentCursor = null;
    this.nextCursor = null;
    this.history = [];
    this.hasPrevious.set(false);
    await this.load();
  }

  async changeSort(field: SupplierSortField): Promise<void> {
    if (this.sortBy() === field) {
      this.sortDescending.update(v => !v);
    } else {
      this.sortBy.set(field);
      this.sortDescending.set(false);
    }
    await this.applyFilters();
  }

  async nextPage(): Promise<void> {
    if (!this.hasNext()) return;
    this.history.push(this.currentCursor);
    this.currentCursor = this.nextCursor;
    this.hasPrevious.set(true);
    await this.load();
  }

  async previousPage(): Promise<void> {
    if (this.history.length === 0) return;
    this.currentCursor = this.history.pop() ?? null;
    this.hasPrevious.set(this.history.length > 0);
    await this.load();
  }

  async toggleActive(supplier: Supplier): Promise<void> {
    this.busyId.set(supplier.id);
    this.actionError.set(null);
    try {
      const updated = supplier.isActive ? await this.svc.deactivate(supplier.id) : await this.svc.activate(supplier.id);
      this.suppliers.update(list => list.map(s => (s.id === updated.id ? updated : s)));
    } catch (err) {
      this.actionError.set(err instanceof Error ? err.message : 'Failed to update supplier status.');
    } finally {
      this.busyId.set(null);
    }
  }

  sortIcon(field: SupplierSortField): string {
    if (this.sortBy() !== field) return 'bi-arrow-down-up';
    return this.sortDescending() ? 'bi-sort-down' : 'bi-sort-up';
  }
}
