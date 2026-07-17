import { Component, inject, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { ExpenseService } from '../../services/expense.service';
import { Expense, EXPENSE_CATEGORIES, ExpenseSummary } from '../../models/expense.model';

@Component({
  selector:    'app-expense-list',
  standalone:  true,
  imports:     [RouterLink, FormsModule, DatePipe, CurrencyPipe, DecimalPipe],
  templateUrl: './expense-list.component.html',
  styleUrl:    './expense-list.component.css',
})
export class ExpenseListComponent {
  private readonly svc = inject(ExpenseService);

  readonly data       = signal<Expense[]>([]);
  readonly loading    = signal(true);
  readonly error      = signal<string | null>(null);
  readonly total      = signal(0);
  readonly cursor     = signal<string | null>(null);
  readonly nextCursor = signal<string | null>(null);
  readonly deleteId   = signal<string | null>(null);
  readonly summary    = signal<ExpenseSummary | null>(null);
  readonly summaryLoading = signal(false);

  readonly search    = signal('');
  readonly category = signal('');
  readonly dateFrom = signal('');
  readonly dateTo   = signal('');

  readonly categories = EXPENSE_CATEGORIES;
  readonly pageSize = 25;
  readonly currentYear = new Date().getFullYear();
  readonly summaryYear = signal(new Date().getFullYear());
  readonly summaryMonth = signal<number | undefined>(undefined);

  readonly totalPages = computed(() => Math.ceil(this.total() / this.pageSize));
  readonly currentPage = computed(() => {
    if (!this.cursor()) return 1;
    return Math.floor(Number(this.cursor()) / this.pageSize) + 1;
  });
  readonly hasActiveFilters = computed(() => !!this.search() || !!this.category() || !!this.dateFrom() || !!this.dateTo());

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
        this.search() || undefined, this.category() || undefined,
        this.dateFrom() || undefined, this.dateTo() || undefined,
      );
      this.data.set(result.items);
      this.total.set(result.totalCount);
      this.nextCursor.set(result.nextCursor);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Could not load expenses.');
    } finally {
      this.loading.set(false);
    }
  }

  async loadSummary(): Promise<void> {
    this.summaryLoading.set(true);
    try {
      const s = await this.svc.getMonthlySummary(this.summaryYear(), this.summaryMonth());
      this.summary.set(s);
    } catch { /* summary is non-critical */ }
    finally { this.summaryLoading.set(false); }
  }

  onFilterChange(): void { void this.load(true); }
  clearFilters(): void {
    this.search.set(''); this.category.set('');
    this.dateFrom.set(''); this.dateTo.set('');
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
      this.error.set(err instanceof Error ? err.message : 'Could not delete expense.');
    }
  }

  onSummaryYearChange(): void { void this.loadSummary(); }
  onSummaryMonthChange(): void { void this.loadSummary(); }
  clearSummaryMonth(): void { this.summaryMonth.set(undefined); void this.loadSummary(); }

  exportCsv(): void {
    const rows = this.data();
    if (rows.length === 0) return;
    const headers = ['Expense #','Category','Type','Vendor','Description','Amount','GST','Payment','Reference','Invoice','Date','Notes'];
    const csv = [
      headers.join(','),
      ...rows.map(r => [
        r.expenseNumber, r.expenseCategory, r.expenseType,
        `"${r.vendor || ''}"`, `"${(r.description || '').replace(/"/g, '""')}"`,
        r.amount, r.gst, r.paymentMethod || '',
        r.referenceNumber || '', r.invoiceNumber || '',
        new Date(r.expenseDate).toLocaleDateString('en-IN'),
        `"${(r.notes || '').replace(/"/g, '""')}"`,
      ].join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `expenses-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  categoryClass(cat: string): string {
    const map: Record<string, string> = {
      Advertisement: 'cat-ad', Packaging: 'cat-pkg', Transportation: 'cat-trans',
      Courier: 'cat-cour', Office: 'cat-off', Salary: 'cat-sal',
      Internet: 'cat-int', Electricity: 'cat-elec', Software: 'cat-sw',
      Marketplace: 'cat-mkt', Photography: 'cat-photo', Miscellaneous: 'cat-misc',
    };
    return map[cat] || 'cat-misc';
  }
}
