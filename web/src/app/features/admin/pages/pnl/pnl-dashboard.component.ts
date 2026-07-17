import { Component, ElementRef, inject, signal, viewChild, effect, OnDestroy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { Chart, registerables } from 'chart.js';
import { PnLService } from '../../services/pnl.service';
import { PnLDashboard } from '../../models/pnl.model';
import { ChartComponent } from '../../../../shared/components/chart/chart.component';

Chart.register(...registerables);

const PALETTE = ['#0f6f84', '#c9a54c', '#22a34a', '#9b4fe0', '#dc2626', '#b45309', '#2563eb', '#db2777'];

@Component({
  selector:    'app-pnl-dashboard',
  standalone:  true,
  imports:     [FormsModule, DecimalPipe, ChartComponent],
  templateUrl: './pnl-dashboard.component.html',
  styleUrl:    './pnl-dashboard.component.css',
})
export class PnLDashboardComponent implements OnDestroy {
  private readonly svc = inject(PnLService);

  readonly data        = signal<PnLDashboard | null>(null);
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
      this.error.set(err instanceof Error ? err.message : 'Could not load P&L Dashboard.');
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
          { label: 'Revenue', data: d.monthlySeries.map(m => m.revenue), borderColor: '#0f6f84', backgroundColor: 'rgba(15,111,132,0.1)', tension: 0.35, fill: true, pointRadius: 4 },
          { label: 'Expenses', data: d.monthlySeries.map(m => m.expenses), borderColor: '#dc2626', backgroundColor: 'rgba(220,38,38,0.1)', tension: 0.35, fill: true, pointRadius: 4 },
          { label: 'Net Profit', data: d.monthlySeries.map(m => m.netProfit), borderColor: '#22a34a', backgroundColor: 'rgba(34,163,74,0.1)', tension: 0.35, fill: true, pointRadius: 4 },
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

  formatPercent(v: number): string {
    return `${v.toFixed(1)}%`;
  }

  namedLabels(items: { name?: string; category?: string; marketplace?: string; supplierName?: string; period?: string }[]): string[] {
    return items.map(i => i.name ?? i.category ?? i.marketplace ?? i.supplierName ?? i.period ?? '');
  }

  namedValues(items: { profit?: number; totalPurchases?: number }[]): number[] {
    return items.map(i => i.profit ?? i.totalPurchases ?? 0);
  }

  exportExcel(): void {
    import('xlsx').then(XLSX => {
      const d = this.data();
      if (!d) return;

      const wb = XLSX.utils.book_new();

      // Summary sheet
      const summaryRows = [
        { Metric: 'Total Revenue', Value: d.summary.totalRevenue },
        { Metric: 'Total Expenses', Value: d.summary.totalExpenses },
        { Metric: 'Gross Profit', Value: d.summary.grossProfit },
        { Metric: 'Net Profit', Value: d.summary.netProfit },
        { Metric: 'Inventory Investment', Value: d.summary.inventoryInvestment },
        { Metric: 'Inventory Value', Value: d.summary.inventoryValue },
        { Metric: 'Expected Profit', Value: d.summary.expectedProfit },
        { Metric: 'Realized Profit', Value: d.summary.realizedProfit },
      ];
      const ws1 = XLSX.utils.json_to_sheet(summaryRows);
      XLSX.utils.book_append_sheet(wb, ws1, 'Summary');

      // Costs sheet
      const costRows = [
        { Category: 'Packaging', Amount: d.costs.packagingCost },
        { Category: 'Advertisement', Amount: d.costs.advertisementCost },
        { Category: 'Marketplace', Amount: d.costs.marketplaceCharges },
        { Category: 'Transportation', Amount: d.costs.transportationCost },
      ];
      const ws2 = XLSX.utils.json_to_sheet(costRows);
      XLSX.utils.book_append_sheet(wb, ws2, 'Costs');

      // Monthly sheet
      if (d.monthlySeries.length > 0) {
        const ws3 = XLSX.utils.json_to_sheet(d.monthlySeries);
        XLSX.utils.book_append_sheet(wb, ws3, 'Monthly P&L');
      }

      // Yearly sheet
      if (d.yearlySeries.length > 0) {
        const ws4 = XLSX.utils.json_to_sheet(d.yearlySeries);
        XLSX.utils.book_append_sheet(wb, ws4, 'Yearly P&L');
      }

      // Category sheet
      if (d.categoryBreakdown.length > 0) {
        const ws5 = XLSX.utils.json_to_sheet(d.categoryBreakdown);
        XLSX.utils.book_append_sheet(wb, ws5, 'Category-wise');
      }

      // Supplier sheet
      if (d.supplierBreakdown.length > 0) {
        const ws6 = XLSX.utils.json_to_sheet(d.supplierBreakdown);
        XLSX.utils.book_append_sheet(wb, ws6, 'Supplier-wise');
      }

      // Marketplace sheet
      if (d.marketplaceBreakdown.length > 0) {
        const ws7 = XLSX.utils.json_to_sheet(d.marketplaceBreakdown);
        XLSX.utils.book_append_sheet(wb, ws7, 'Marketplace-wise');
      }

      XLSX.writeFile(wb, `pnl-${this.year()}-${new Date().toISOString().slice(0, 10)}.xlsx`);
    });
  }

  exportPdf(): void {
    window.print();
  }

  ngOnDestroy(): void {
    this.monthlyChart?.destroy();
  }
}
