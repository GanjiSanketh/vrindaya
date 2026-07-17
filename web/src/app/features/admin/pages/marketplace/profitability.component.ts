import { Component, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ProfitabilityService } from '../../services/profitability.service';
import { ProductProfitabilityRow } from '../../models/product-listing.model';

const FILTER_CHIPS = ['all', 'highestProfit', 'lowestProfit', 'negativeMargin', 'highInvestment', 'deadStock', 'fastMoving'] as const;
type FilterChip = typeof FILTER_CHIPS[number];

const FILTER_LABELS: Record<FilterChip, string> = {
  all: 'All Products',
  highestProfit: 'Highest Profit',
  lowestProfit: 'Lowest Profit',
  negativeMargin: 'Negative Margin',
  highInvestment: 'High Investment',
  deadStock: 'Dead Stock',
  fastMoving: 'Fast Moving',
};

@Component({
  selector:    'app-profitability',
  standalone:  true,
  imports:     [FormsModule],
  templateUrl: './profitability.component.html',
  styleUrl:    './profitability.component.css',
})
export class ProfitabilityComponent {
  private readonly svc = inject(ProfitabilityService);

  readonly data        = signal<ProductProfitabilityRow[]>([]);
  readonly loading     = signal(true);
  readonly error       = signal<string | null>(null);
  readonly total       = signal(0);
  readonly cursor      = signal<string | null>(null);
  readonly nextCursor  = signal<string | null>(null);
  readonly filter      = signal<FilterChip>('all');
  readonly search      = signal('');
  readonly marketplace = signal('');

  readonly marketplaces = signal<string[]>([]);

  readonly pageSize = 50;

  readonly chips       = FILTER_CHIPS;
  readonly filterLabel = (chip: string): string => FILTER_LABELS[chip as FilterChip] ?? chip;

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
      const result = await this.svc.getProfitability({
        filter: this.filter() === 'all' ? undefined : this.filter(),
        search: this.search() || undefined,
        marketplace: this.marketplace() || undefined,
        cursor: this.cursor() || undefined,
        pageSize: this.pageSize,
      });
      this.data.set(result.items);
      this.total.set(result.totalCount);
      this.nextCursor.set(result.nextCursor);

      this.extractFilterOptions(result.items);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Could not load profitability data.');
    } finally {
      this.loading.set(false);
    }
  }

  private extractFilterOptions(items: ProductProfitabilityRow[]): void {
    const mps = new Set<string>();
    for (const item of items) {
      if (item.marketplace) mps.add(item.marketplace);
    }
    if (mps.size > 0) this.marketplaces.set(Array.from(mps).sort());
  }

  setFilter(chip: string): void {
    if (this.filter() === chip && chip !== 'all') return;
    this.filter.set(chip as FilterChip);
    void this.load(true);
  }

  onSearch(): void {
    void this.load(true);
  }

  clearSearch(): void {
    this.search.set('');
    void this.load(true);
  }

  onMarketplaceChange(): void {
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

  formatCurrency(value: number): string {
    return `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  }

  formatPercent(value: number): string {
    return `${value.toFixed(1)}%`;
  }

  profitClass(value: number): string {
    if (value > 0) return 'profit-pos';
    if (value < 0) return 'profit-neg';
    return 'profit-zero';
  }
}
