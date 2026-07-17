import { Component, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { SettlementReconciliationService } from '../../services/settlement-reconciliation.service';
import { SettlementReconciliation, SettlementDiscrepancy, REVENUE_SOURCES, DISCREPANCY_TYPES } from '../../models/settlement.model';
import { ChartComponent } from '../../../../shared/components/chart/chart.component';

@Component({
  selector:    'app-settlement-reconciliation',
  standalone:  true,
  imports:     [FormsModule, DecimalPipe, ChartComponent],
  templateUrl: './settlement-reconciliation.component.html',
  styleUrl:    './settlement-reconciliation.component.css',
})
export class SettlementReconciliationComponent {
  private readonly svc = inject(SettlementReconciliationService);

  readonly data         = signal<SettlementReconciliation | null>(null);
  readonly loading      = signal(true);
  readonly error        = signal<string | null>(null);
  readonly source       = signal('');
  readonly type         = signal('');
  readonly year         = signal(new Date().getFullYear());
  readonly month        = signal<number | undefined>(undefined);

  readonly revenueSources = REVENUE_SOURCES;
  readonly discrepancyTypes = DISCREPANCY_TYPES;
  readonly currentYear = new Date().getFullYear();

  readonly visibleDiscrepancies = signal<SettlementDiscrepancy[]>([]);
  readonly pageSize = 20;
  readonly currentPage = signal(1);

  readonly totalPages = computed(() => Math.ceil(this.visibleDiscrepancies().length / this.pageSize));
  readonly pagedItems = computed(() => {
    const page = this.currentPage();
    return this.visibleDiscrepancies().slice((page - 1) * this.pageSize, page * this.pageSize);
  });

  constructor() {
    void this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const result = await this.svc.getReconciliation(
        this.source() || undefined,
        this.type() || undefined,
        this.year(),
        this.month() || undefined,
      );
      this.data.set(result);
      this.visibleDiscrepancies.set(result.discrepancies);
      this.currentPage.set(1);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Could not load settlement reconciliation.');
    } finally {
      this.loading.set(false);
    }
  }

  onFilterChange(): void { void this.load(); }
  clearFilters(): void {
    this.source.set(''); this.type.set('');
    this.month.set(undefined);
    void this.load();
  }
  prevPage(): void { this.currentPage.update(p => Math.max(1, p - 1)); }
  nextPage(): void { this.currentPage.update(p => Math.min(this.totalPages(), p + 1)); }

  formatCurrency(v: number): string {
    return `₹${v.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  }

  discrepancyIcon(type: string): string {
    const map: Record<string, string> = {
      MissingPayment: 'bi-exclamation-triangle',
      CommissionMismatch: 'bi-arrow-left-right',
      UnexpectedCharges: 'bi-shield-exclamation',
      SettlementDelay: 'bi-clock-history',
    };
    return map[type] || 'bi-question-circle';
  }

  discrepancyClass(type: string): string {
    const map: Record<string, string> = {
      MissingPayment: 'dc-missing',
      CommissionMismatch: 'dc-commission',
      UnexpectedCharges: 'dc-charges',
      SettlementDelay: 'dc-delay',
    };
    return map[type] || '';
  }

  typeLabels(items: { type: string; label: string }[]): string[] {
    return items.map(i => i.label);
  }

  typeCounts(items: { type: string; count: number }[]): number[] {
    return items.map(i => i.count);
  }

  typeAmounts(items: { type: string; amount: number }[]): number[] {
    return items.map(i => i.amount);
  }

  exportExcel(): void {
    import('xlsx').then(XLSX => {
      const d = this.data();
      if (!d) return;
      const wb = XLSX.utils.book_new();

      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([
        { Metric: 'Total Expected', Value: d.summary.totalExpected },
        { Metric: 'Total Actual', Value: d.summary.totalActual },
        { Metric: 'Total Difference', Value: d.summary.totalDifference },
        { Metric: 'Discrepancy Count', Value: d.summary.discrepancyCount },
        { Metric: 'Discrepancy Amount', Value: d.summary.discrepancyAmount },
        { Metric: 'Matched Records', Value: d.summary.matchedRecords },
        { Metric: 'Total Records', Value: d.summary.totalRecords },
      ]), 'Summary');

      if (d.discrepancyGroups.length > 0) {
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
          d.discrepancyGroups.map(g => ({ Type: g.label, Count: g.count, Amount: g.amount })),
        ), 'By Type');
      }

      if (d.discrepancies.length > 0) {
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
          d.discrepancies.map(dd => ({
            'Revenue #': dd.revenueNumber,
            Source: dd.source,
            Type: dd.label,
            'Expected Amount': dd.expectedAmount,
            'Actual Amount': dd.actualAmount,
            Difference: dd.difference,
            Description: dd.description,
            'Settlement Date': dd.settlementDate,
            Status: dd.status,
          })),
        ), 'Discrepancies');
      }

      XLSX.writeFile(wb, `settlement-reconciliation-${new Date().toISOString().slice(0, 10)}.xlsx`);
    });
  }

  exportPdf(): void {
    window.print();
  }
}
