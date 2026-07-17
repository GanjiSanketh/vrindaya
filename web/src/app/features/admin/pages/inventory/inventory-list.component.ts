import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { InventoryService } from '../../services/inventory.service';
import { InventoryStatusFilter, InventoryVariant } from '../../models/inventory.model';
import { APP_ROUTES } from '../../../../core/constants/routes.constants';

@Component({
  selector: 'app-inventory-list',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './inventory-list.component.html',
  styleUrl: './inventory-list.component.css',
})
export class InventoryListComponent {
  private readonly svc = inject(InventoryService);
  readonly BASE = `/${APP_ROUTES.ADMIN}/inventory`;

  readonly variants = signal<InventoryVariant[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly success = signal<string | null>(null);
  readonly hasNext = signal(false);
  readonly hasPrevious = signal(false);
  readonly statusFilter = signal<InventoryStatusFilter>('all');
  readonly selectedIds = signal<ReadonlySet<string>>(new Set());
  readonly bulkLowThreshold = signal(5);
  readonly bulkCriticalThreshold = signal(2);
  readonly bulkSaving = signal(false);

  private currentCursor: string | null = null;
  private nextCursor: string | null = null;
  private history: (string | null)[] = [];

  constructor() { void this.load(); }

  readonly isSelected = (id: string) => this.selectedIds().has(id);
  readonly allVisibleSelected = () => this.variants().length > 0 && this.variants().every(v => this.isSelected(v.id));

  async setStatusFilter(filter: InventoryStatusFilter): Promise<void> {
    if (filter === this.statusFilter()) return;
    this.statusFilter.set(filter);
    this.currentCursor = null;
    this.nextCursor = null;
    this.history = [];
    this.hasPrevious.set(false);
    await this.load();
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    this.success.set(null);
    this.selectedIds.set(new Set());
    try {
      const filter = this.statusFilter();
      if (filter === 'all') {
        const page = await this.svc.getVariants(this.currentCursor);
        this.variants.set(page.items);
        this.nextCursor = page.nextCursor;
        this.hasNext.set(!!page.nextCursor);
      } else {
        this.variants.set(await this.svc.getVariantsByStatus(filter));
        this.nextCursor = null;
        this.hasNext.set(false);
      }
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Could not load inventory.');
    } finally {
      this.loading.set(false);
    }
  }

  toggleVariant(id: string, checked: boolean): void {
    const selected = new Set(this.selectedIds());
    checked ? selected.add(id) : selected.delete(id);
    this.selectedIds.set(selected);
  }

  toggleAllVisible(checked: boolean): void {
    const selected = new Set(this.selectedIds());
    for (const variant of this.variants()) checked ? selected.add(variant.id) : selected.delete(variant.id);
    this.selectedIds.set(selected);
  }

  async applyBulkThresholds(): Promise<void> {
    const variantIds = [...this.selectedIds()];
    const lowStockThreshold = Number(this.bulkLowThreshold());
    const criticalStockThreshold = Number(this.bulkCriticalThreshold());
    this.error.set(null);
    this.success.set(null);

    if (variantIds.length === 0) { this.error.set('Select at least one variant first.'); return; }
    if (!Number.isInteger(lowStockThreshold) || lowStockThreshold < 0 || !Number.isInteger(criticalStockThreshold) || criticalStockThreshold < 0) {
      this.error.set('Thresholds must be whole numbers greater than or equal to zero.'); return;
    }
    if (criticalStockThreshold > lowStockThreshold) {
      this.error.set('Critical threshold cannot be greater than the low stock threshold.'); return;
    }

    this.bulkSaving.set(true);
    try {
      await this.svc.bulkUpdateStockThresholds({ variantIds, lowStockThreshold, criticalStockThreshold });
      await this.load();
      this.success.set(`Thresholds updated for ${variantIds.length} variant${variantIds.length === 1 ? '' : 's'}.`);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Could not update stock thresholds.');
    } finally {
      this.bulkSaving.set(false);
    }
  }

  async nextPage(): Promise<void> {
    if (!this.hasNext() || this.statusFilter() !== 'all') return;
    this.history.push(this.currentCursor);
    this.currentCursor = this.nextCursor;
    this.hasPrevious.set(true);
    await this.load();
  }

  async previousPage(): Promise<void> {
    if (this.history.length === 0 || this.statusFilter() !== 'all') return;
    this.currentCursor = this.history.pop() ?? null;
    this.hasPrevious.set(this.history.length > 0);
    await this.load();
  }

  formatCurrency(value: number): string { return `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`; }
  statusLabel(status: InventoryVariant['status']): string { return status === 'OutOfStock' ? 'Out of Stock' : status; }
  sellingPrice(v: InventoryVariant): number | null { return v.marketplaceProfiles.find(p => p.marketplaceType === 'Website')?.effectiveSellingPrice ?? null; }
}
