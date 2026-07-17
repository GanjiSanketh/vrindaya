import { Component, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ForecastService } from '../../services/forecast.service';
import { InventoryForecastRow } from '../../models/inventory.model';

const STATUS_CHIPS = ['all', 'Critical', 'Low', 'Healthy', 'Overstock', 'OutOfStock'] as const;

@Component({
  selector:    'app-inventory-forecast',
  standalone:  true,
  imports:     [FormsModule],
  templateUrl: './inventory-forecast.component.html',
  styleUrl:    './inventory-forecast.component.css',
})
export class InventoryForecastComponent {
  private readonly svc = inject(ForecastService);

  readonly data        = signal<InventoryForecastRow[]>([]);
  readonly loading     = signal(true);
  readonly error       = signal<string | null>(null);
  readonly total       = signal(0);
  readonly cursor      = signal<string | null>(null);
  readonly nextCursor  = signal<string | null>(null);
  readonly statusFilter = signal('all');
  readonly search       = signal('');

  readonly pageSize = 50;
  readonly chips = STATUS_CHIPS;

  readonly totalPages = computed(() => Math.ceil(this.total() / this.pageSize));
  readonly currentPage = computed(() => {
    if (!this.cursor()) return 1;
    return Math.floor(Number(this.cursor()) / this.pageSize) + 1;
  });

  constructor() {
    void this.load();
  }

  async load(resetCursor = true): Promise<void> {
    if (resetCursor) this.cursor.set(null);
    this.loading.set(true);
    this.error.set(null);
    try {
      const result = await this.svc.getForecast({
        status: this.statusFilter() === 'all' ? undefined : this.statusFilter(),
        search: this.search() || undefined,
        cursor: this.cursor() || undefined,
        pageSize: this.pageSize,
      });
      this.data.set(result.items);
      this.total.set(result.totalCount);
      this.nextCursor.set(result.nextCursor);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Could not load forecast data.');
    } finally {
      this.loading.set(false);
    }
  }

  setStatusFilter(chip: string): void {
    this.statusFilter.set(chip);
    void this.load(true);
  }

  onSearch(): void {
    void this.load(true);
  }

  clearSearch(): void {
    this.search.set('');
    void this.load(true);
  }

  prevPage(): void {
    const prev = Math.max(0, (Number(this.cursor()) || 0) - this.pageSize);
    this.cursor.set(String(prev));
    void this.load(false);
  }

  nextPage(): void {
    if (this.nextCursor()) {
      this.cursor.set(this.nextCursor());
      void this.load(false);
    }
  }

  hasPrev(): boolean {
    return (Number(this.cursor()) || 0) > 0;
  }

  hasNext(): boolean {
    return !!this.nextCursor();
  }

  statusClass(status: string): string {
    switch (status) {
      case 'Overstock': return 'badge-overstock';
      case 'Critical': return 'badge-critical';
      case 'Low': return 'badge-low';
      case 'OutOfStock': return 'badge-out';
      default: return 'badge-healthy';
    }
  }

  daysClass(days: number): string {
    if (days >= 90) return 'days-high';
    if (days >= 30) return 'days-mid';
    if (days < 0) return 'days-none';
    return 'days-low';
  }

  needsReorder(reorderQty: number): boolean {
    return reorderQty > 0;
  }
}
