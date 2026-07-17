import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { InventoryService } from '../../services/inventory.service';
import { InventoryDashboard, MOVEMENT_TYPE_LABELS } from '../../models/inventory.model';
import { APP_ROUTES } from '../../../../core/constants/routes.constants';
import { CategoryService } from '../../../../core/services/category.service';
import { CollectionService } from '../../../../core/services/collection.service';
import { SupplierService } from '../../services/supplier.service';
import { Category } from '../../../../core/models/product.model';
import { Collection } from '../../../../core/models/collection.model';
import { Supplier } from '../../models/supplier.model';
import { ChartComponent } from '../../../../shared/components/chart/chart.component';

function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

@Component({
  selector:    'app-inventory-dashboard',
  standalone:  true,
  imports:     [RouterLink, FormsModule, ChartComponent],
  templateUrl: './inventory-dashboard.component.html',
  styleUrl:    './inventory-dashboard.component.css',
})
export class InventoryDashboardComponent {
  private readonly svc            = inject(InventoryService);
  private readonly categorySvc    = inject(CategoryService);
  private readonly collectionSvc  = inject(CollectionService);
  private readonly supplierSvc    = inject(SupplierService);

  readonly BASE = `/${APP_ROUTES.ADMIN}/inventory`;
  readonly MOVEMENT_TYPE_LABELS = MOVEMENT_TYPE_LABELS;

  readonly data    = signal<InventoryDashboard | null>(null);
  readonly loading = signal(true);
  readonly error   = signal<string | null>(null);

  readonly categories   = signal<Category[]>([]);
  readonly collections  = signal<Collection[]>([]);
  readonly suppliers    = signal<Supplier[]>([]);

  // Filters — combinable (AND), unlike the mutually-exclusive product-list pattern.
  readonly categoryFilter   = signal('');
  readonly supplierFilter   = signal('');
  readonly collectionFilter = signal('');
  readonly dateFrom = signal(toDateInputValue(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)));
  readonly dateTo   = signal(toDateInputValue(new Date()));

  readonly hasActiveFilters = () =>
    !!this.categoryFilter() || !!this.supplierFilter() || !!this.collectionFilter()
    || this.dateFrom() !== toDateInputValue(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
    || this.dateTo() !== toDateInputValue(new Date());

  constructor() {
    void this.loadFilterOptions();
    void this.load();
  }

  private async loadFilterOptions(): Promise<void> {
    try {
      const [categories, collections, suppliers] = await Promise.all([
        this.categorySvc.getAll(),
        this.collectionSvc.getAll(),
        this.supplierSvc.getAll(null, 100, undefined, true).then(page => page.items),
      ]);
      this.categories.set(categories);
      this.collections.set(collections);
      this.suppliers.set(suppliers);
    } catch {
      // Filter dropdowns are a convenience, not critical — a failure here shouldn't block the dashboard itself.
    }
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      this.data.set(await this.svc.getDashboard({
        category:     this.categoryFilter() || undefined,
        supplierId:   this.supplierFilter() || undefined,
        collectionId: this.collectionFilter() || undefined,
        dateFrom:     this.dateFrom() || undefined,
        dateTo:       this.dateTo() || undefined,
      }));
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Could not load the inventory dashboard.');
    } finally {
      this.loading.set(false);
    }
  }

  onFilterChange(): void {
    void this.load();
  }

  clearFilters(): void {
    this.categoryFilter.set('');
    this.supplierFilter.set('');
    this.collectionFilter.set('');
    this.dateFrom.set(toDateInputValue(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)));
    this.dateTo.set(toDateInputValue(new Date()));
    void this.load();
  }

  formatCurrency(value: number): string {
    return `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  timeSeriesLabels(points: { date: string }[]): string[] {
    return points.map(p => new Date(p.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }));
  }

  timeSeriesValues(points: { value: number }[]): number[] {
    return points.map(p => p.value);
  }

  namedLabels(items: { name: string }[]): string[] {
    return items.map(i => i.name);
  }

  /** "yyyy-MM" -> "Jul 2026" — used only for the Purchases by Month chart, whose NamedValue.name is a month key rather than a display label. */
  monthLabels(items: { name: string }[]): string[] {
    return items.map(i => {
      const [year, month] = i.name.split('-').map(Number);
      return new Date(year, month - 1, 1).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
    });
  }

  namedValues(items: { value: number }[]): number[] {
    return items.map(i => i.value);
  }
}
