import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { InventoryService } from '../../services/inventory.service';
import { StockMovement, StockMovementType, MOVEMENT_TYPE_LABELS } from '../../models/inventory.model';

const MOVEMENT_TYPES: StockMovementType[] = ['Purchase', 'Sale', 'Return', 'Damage', 'ManualAdjustment', 'StockCorrection', 'Transfer'];

@Component({
  selector:    'app-stock-movement-history',
  standalone:  true,
  imports:     [FormsModule],
  templateUrl: './stock-movement-history.component.html',
  styleUrl:    './stock-movement-history.component.css',
})
export class StockMovementHistoryComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly svc   = inject(InventoryService);

  readonly MOVEMENT_TYPES = MOVEMENT_TYPES;
  readonly MOVEMENT_TYPE_LABELS = MOVEMENT_TYPE_LABELS;

  readonly movements = signal<StockMovement[]>([]);
  readonly loading   = signal(true);
  readonly error     = signal<string | null>(null);
  readonly hasNext     = signal(false);
  readonly hasPrevious = signal(false);

  // Filters are combinable — productId + movementType + search + date range can all be set at once.
  readonly productIdFilter    = signal<string>('');
  readonly movementTypeFilter = signal<string>('');
  readonly searchFilter       = signal<string>('');
  readonly dateFromFilter     = signal<string>('');
  readonly dateToFilter       = signal<string>('');

  private currentCursor: string | null = null;
  private nextCursor: string | null = null;
  private history: (string | null)[] = [];
  private searchDebounce: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    const productId = this.route.snapshot.queryParamMap.get('productId');
    if (productId) this.productIdFilter.set(productId);
    void this.load();
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const page = await this.svc.getMovements(this.currentCursor, 20, {
        productId:    this.productIdFilter() || undefined,
        movementType: (this.movementTypeFilter() || undefined) as StockMovementType | undefined,
        search:       this.searchFilter() || undefined,
        dateFrom:     this.dateFromFilter() || undefined,
        dateTo:       this.dateToFilter() || undefined,
      });
      this.movements.set(page.items);
      this.nextCursor = page.nextCursor;
      this.hasNext.set(!!page.nextCursor);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Could not load stock movements.');
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

  onSearchInput(value: string): void {
    this.searchFilter.set(value);
    clearTimeout(this.searchDebounce);
    this.searchDebounce = setTimeout(() => void this.applyFilters(), 300);
  }

  hasActiveFilters(): boolean {
    return !!(this.productIdFilter() || this.movementTypeFilter() || this.searchFilter() || this.dateFromFilter() || this.dateToFilter());
  }

  async clearFilters(): Promise<void> {
    this.productIdFilter.set('');
    this.movementTypeFilter.set('');
    this.searchFilter.set('');
    this.dateFromFilter.set('');
    this.dateToFilter.set('');
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

  formatDate(iso: string): string {
    return new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
}
