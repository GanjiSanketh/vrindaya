import { Component, ElementRef, inject, signal, viewChild, effect, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { Chart, registerables } from 'chart.js';
import { CashFlowService } from '../../services/cash-flow.service';
import { CashFlowDashboard } from '../../models/cash-flow.model';
import { ChartComponent } from '../../../../shared/components/chart/chart.component';

Chart.register(...registerables);

@Component({
  selector:    'app-cash-flow-dashboard',
  standalone:  true,
  imports:     [FormsModule, DecimalPipe, ChartComponent],
  templateUrl: './cash-flow-dashboard.component.html',
  styleUrl:    './cash-flow-dashboard.component.css',
})
export class CashFlowDashboardComponent implements OnDestroy {
  private readonly svc = inject(CashFlowService);

  readonly data        = signal<CashFlowDashboard | null>(null);
  readonly loading     = signal(true);
  readonly error       = signal<string | null>(null);
  readonly year        = signal(new Date().getFullYear());
  readonly month       = signal<number | undefined>(undefined);

  private monthlyChart: Chart | null = null;
  private readonly monthlyCanvas = viewChild<ElementRef<HTMLCanvasElement>>('monthlyChart');

  readonly currentYear = new Date().getFullYear();

  constructor() {
    effect(() => {
      this.data();
      this.monthlyCanvas();
      setTimeout(() => this.buildMonthlyChart());
    });
    void this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      this.data.set(await this.svc.getDashboard(this.year(), this.month()));
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Could not load Cash Flow Dashboard.');
    } finally {
      this.loading.set(false);
    }
  }

  onYearChange(): void { void this.load(); }
  onMonthChange(): void { void this.load(); }

  buildMonthlyChart(): void {
    const d = this.data();
    const canvas = this.monthlyCanvas()?.nativeElement;
    if (!d || !canvas || d.monthlySeries.length === 0) return;

    this.monthlyChart?.destroy();

    const labels = d.monthlySeries.map(m => m.period);
    this.monthlyChart = new Chart(canvas, {
      type: 'line',
      data: {
        labels,
        datasets: [
          { label: 'Money In', data: d.monthlySeries.map(m => m.moneyIn), borderColor: '#22a34a', backgroundColor: 'rgba(34,163,74,0.1)', tension: 0.35, fill: true, pointRadius: 4 },
          { label: 'Money Out', data: d.monthlySeries.map(m => m.moneyOut), borderColor: '#dc2626', backgroundColor: 'rgba(220,38,38,0.1)', tension: 0.35, fill: true, pointRadius: 4 },
          { label: 'Net Flow', data: d.monthlySeries.map(m => m.netFlow), borderColor: '#0f6f84', backgroundColor: 'rgba(15,111,132,0.1)', tension: 0.35, fill: true, pointRadius: 4 },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: { legend: { position: 'top' } },
        scales: { y: { beginAtZero: true } },
      },
    });
  }

  formatCurrency(v: number): string {
    return `₹${v.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  }

  namedLabels(items: { period?: string }[]): string[] {
    return items.map(i => i.period ?? '');
  }

  exportExcel(): void {
    import('xlsx').then(XLSX => {
      const d = this.data();
      if (!d) return;

      const wb = XLSX.utils.book_new();

      const summaryRows = [
        { Metric: 'Money In', Value: d.summary.moneyIn },
        { Metric: 'Money Out', Value: d.summary.moneyOut },
        { Metric: 'Pending Settlements', Value: d.summary.pendingSettlements },
        { Metric: 'Pending Expenses', Value: d.summary.pendingExpenses },
        { Metric: 'Cash Balance', Value: d.summary.cashBalance },
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryRows), 'Summary');

      if (d.monthlySeries.length > 0) {
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(d.monthlySeries), 'Monthly');
      }
      if (d.yearlySeries.length > 0) {
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(d.yearlySeries), 'Yearly');
      }

      XLSX.writeFile(wb, `cash-flow-${this.year()}-${new Date().toISOString().slice(0, 10)}.xlsx`);
    });
  }

  exportPdf(): void {
    window.print();
  }

  ngOnDestroy(): void {
    this.monthlyChart?.destroy();
  }
}
