import { Component, inject, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { RevenueService } from '../../services/revenue.service';
import { Revenue, REVENUE_SOURCES, REVENUE_STATUSES, RevenueSummary } from '../../models/revenue.model';

@Component({
  selector:    'app-revenue-list',
  standalone:  true,
  imports:     [RouterLink, FormsModule, DatePipe, CurrencyPipe, DecimalPipe],
  templateUrl: './revenue-list.component.html',
  styleUrl:    './revenue-list.component.css',
})
export class RevenueListComponent {
  private readonly svc = inject(RevenueService);

  readonly data       = signal<Revenue[]>([]);
  readonly loading    = signal(true);
  readonly error      = signal<string | null>(null);
  readonly total      = signal(0);
  readonly cursor     = signal<string | null>(null);
  readonly nextCursor = signal<string | null>(null);
  readonly deleteId   = signal<string | null>(null);
  readonly summary    = signal<RevenueSummary | null>(null);
  readonly summaryLoading = signal(false);

  readonly search    = signal('');
  readonly source    = signal('');
  readonly status    = signal('');
  readonly dateFrom = signal('');
  readonly dateTo   = signal('');

  readonly revenueSources = REVENUE_SOURCES;
  readonly revenueStatuses = REVENUE_STATUSES;
  readonly pageSize = 25;
  readonly currentYear = new Date().getFullYear();
  readonly summaryYear = signal(new Date().getFullYear());
  readonly summaryMonth = signal<number | undefined>(undefined);

  readonly totalPages = computed(() => Math.ceil(this.total() / this.pageSize));
  readonly currentPage = computed(() => {
    if (!this.cursor()) return 1;
    return Math.floor(Number(this.cursor()) / this.pageSize) + 1;
  });
  readonly hasActiveFilters = computed(() => !!this.search() || !!this.source() || !!this.status() || !!this.dateFrom() || !!this.dateTo());
  readonly pendingCount = computed(() => this.summary()?.statusBreakdown?.find(s => s.status === 'Pending')?.count ?? 0);

  constructor() {
    void this.load();
    void this.loadSummary();
  }

  async load(resetCursor = true): Promise<void> {
    if (resetCursor) this.cursor.set(null);
    this.loading.set(true);
    this.error.set(null);
    try {
      const result = await this.svc.getAll(
        this.cursor() || undefined, this.pageSize,
        this.search() || undefined, this.source() || undefined, this.status() || undefined,
        this.dateFrom() || undefined, this.dateTo() || undefined,
      );
      this.data.set(result.items);
      this.total.set(result.totalCount);
      this.nextCursor.set(result.nextCursor);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Could not load revenues.');
    } finally {
      this.loading.set(false);
    }
  }

  async loadSummary(): Promise<void> {
    this.summaryLoading.set(true);
    try {
      const s = await this.svc.getMonthlySummary(this.summaryYear(), this.summaryMonth());
      this.summary.set(s);
    } catch { }
    finally { this.summaryLoading.set(false); }
  }

  onFilterChange(): void { void this.load(true); }
  clearFilters(): void {
    this.search.set(''); this.source.set('');
    this.status.set(''); this.dateFrom.set(''); this.dateTo.set('');
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
  hasPrev(): boolean { return (Number(this.cursor()) || 0) > 0; }
  hasNext(): boolean { return !!this.nextCursor(); }

  confirmDelete(id: string): void { this.deleteId.set(id); }
  cancelDelete(): void { this.deleteId.set(null); }

  async doDelete(): Promise<void> {
    const id = this.deleteId();
    if (!id) return;
    try {
      await this.svc.delete(id);
      this.deleteId.set(null);
      void this.load(true);
      void this.loadSummary();
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Could not delete revenue.');
    }
  }

  onSummaryYearChange(): void { void this.loadSummary(); }
  onSummaryMonthChange(): void { void this.loadSummary(); }
  clearSummaryMonth(): void { this.summaryMonth.set(undefined); void this.loadSummary(); }

  exportCsv(): void {
    const rows = this.data();
    if (rows.length === 0) return;
    const headers = ['Revenue #','Source','Amount','Reference','Settlement Date','Expected','Actual','Status','Product','Notes'];
    const csv = [
      headers.join(','),
      ...rows.map(r => [
        r.revenueNumber, r.source, r.amount,
        `"${(r.reference || '').replace(/"/g, '""')}"`,
        new Date(r.settlementDate).toLocaleDateString('en-IN'),
        r.expectedSettlement, r.actualSettlement ?? '',
        r.status,
        `"${(r.productName || '').replace(/"/g, '""')}"`,
        `"${(r.notes || '').replace(/"/g, '""')}"`,
      ].join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `revenues-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  sourceIcon(src: string): string {
    const map: Record<string, string> = {
      Flipkart: 'bi-shop', Website: 'bi-globe2',
      Manual: 'bi-pencil-square', Instagram: 'bi-instagram',
    };
    return map[src] || 'bi-cash';
  }

  sourceClass(src: string): string {
    const map: Record<string, string> = {
      Flipkart: 'src-flipkart', Website: 'src-website',
      Manual: 'src-manual', Instagram: 'src-instagram',
    };
    return map[src] || '';
  }

  statusClass(st: string): string {
    const map: Record<string, string> = {
      Paid: 'st-paid', Pending: 'st-pending', Failed: 'st-failed',
    };
    return map[st] || '';
  }
}
