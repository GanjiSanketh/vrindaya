import { Component, inject, signal, ElementRef, viewChild, ChangeDetectionStrategy, AfterViewInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { ProductApiService } from '../../../../core/services/product-api.service';
import { DashboardDto } from '../../../../core/models/product-api.model';
import { AdminAuthService } from '../../services/admin-auth.service';
import { APP_ROUTES } from '../../../../core/constants/routes.constants';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

const COLORS = ['#0f6f84', '#c9a54c', '#22a34a', '#9b4fe0', '#dc2626', '#b45309', '#6b7280', '#be123c', '#0891b2', '#65a30d'];

interface AnimatedValues {
  products: number;
  variants: number;
  units: number;
  inventoryValue: number;
  revenue: number;
  profit: number;
  avgProfitPct: number;
  avgRoiPct: number;
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [RouterLink, CurrencyPipe, DatePipe, DecimalPipe],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminDashboardComponent implements AfterViewInit {
  readonly productApi = inject(ProductApiService);
  readonly authSvc = inject(AdminAuthService);
  readonly BASE = `/${APP_ROUTES.ADMIN}`;

  readonly data = signal<DashboardDto | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly animated = signal<AnimatedValues>({
    products: 0, variants: 0, units: 0, inventoryValue: 0,
    revenue: 0, profit: 0, avgProfitPct: 0, avgRoiPct: 0,
  });

  private refreshTimer: ReturnType<typeof setInterval> | null = null;
  private viewReady = false;

  readonly pie1 = viewChild<ElementRef<HTMLCanvasElement>>('pie1');
  readonly pie2 = viewChild<ElementRef<HTMLCanvasElement>>('pie2');
  readonly pie3 = viewChild<ElementRef<HTMLCanvasElement>>('pie3');
  readonly pie4 = viewChild<ElementRef<HTMLCanvasElement>>('pie4');
  readonly pie5 = viewChild<ElementRef<HTMLCanvasElement>>('pie5');
  readonly bar1 = viewChild<ElementRef<HTMLCanvasElement>>('bar1');
  readonly bar2 = viewChild<ElementRef<HTMLCanvasElement>>('bar2');
  readonly bar3 = viewChild<ElementRef<HTMLCanvasElement>>('bar3');
  readonly bar4 = viewChild<ElementRef<HTMLCanvasElement>>('bar4');
  readonly donut = viewChild<ElementRef<HTMLCanvasElement>>('donut');

  private charts: Chart[] = [];

  constructor() {
    this.productApi.ensureLoaded();
    this.loadDashboard();
  }

  ngAfterViewInit() {
    this.viewReady = true;
    const d = this.data();
    if (d) {
      setTimeout(() => {
        this.renderAllCharts(d);
        this.animateCounters(d);
      }, 200);
    }
  }

  private async loadDashboard() {
    try {
      const d = await firstValueFrom(this.productApi.getDashboard());
      this.data.set(d!);
      if (this.viewReady) {
        setTimeout(() => {
          this.renderAllCharts(d!);
          this.animateCounters(d!);
        }, 200);
      }
      this.startAutoRefresh();
    } catch (e: any) {
      this.error.set(e?.message ?? 'Failed to load dashboard data');
    } finally {
      this.loading.set(false);
    }
  }

  private startAutoRefresh() {
    if (this.refreshTimer) clearInterval(this.refreshTimer);
    this.refreshTimer = setInterval(async () => {
      try {
        const d = await firstValueFrom(this.productApi.getDashboard());
        if (d) {
          this.data.set(d);
          if (this.viewReady) {
            this.renderAllCharts(d);
            this.animateCounters(d);
          }
        }
      } catch { /* swallow auto-refresh errors */ }
    }, 60000);
  }

  private animateCounters(d: DashboardDto) {
    const targets: AnimatedValues = {
      products: d.summaryCards.totalProducts,
      variants: d.summaryCards.totalVariants,
      units: d.summaryCards.inventoryQuantity,
      inventoryValue: d.summaryCards.inventoryValue,
      revenue: d.summaryCards.potentialSalesValue,
      profit: d.summaryCards.expectedProfit,
      avgProfitPct: d.summaryCards.averageProfitPercent,
      avgRoiPct: d.summaryCards.averageRoiPercent,
    };
    const duration = 1000;
    const start = performance.now();
    const initial: AnimatedValues = {
      products: 0, variants: 0, units: 0, inventoryValue: 0,
      revenue: 0, profit: 0, avgProfitPct: 0, avgRoiPct: 0,
    };
    this.animated.set(initial);

    const step = (now: number) => {
      const elapsed = now - start;
      const t = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      const current: AnimatedValues = {
        products: Math.round(targets.products * ease),
        variants: Math.round(targets.variants * ease),
        units: Math.round(targets.units * ease),
        inventoryValue: Math.round(targets.inventoryValue * ease * 100) / 100,
        revenue: Math.round(targets.revenue * ease * 100) / 100,
        profit: Math.round(targets.profit * ease * 100) / 100,
        avgProfitPct: Math.round(targets.avgProfitPct * ease * 10) / 10,
        avgRoiPct: Math.round(targets.avgRoiPct * ease * 10) / 10,
      };
      this.animated.set(current);
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  private renderAllCharts(d: DashboardDto) {
    this.destroyCharts();
    const pie = (canvas: HTMLCanvasElement | undefined, labels: string[], values: number[]) => {
      if (!canvas || !labels.length) return null;
      return new Chart(canvas, {
        type: 'doughnut', data: { labels, datasets: [{ data: values, backgroundColor: COLORS.slice(0, labels.length), borderWidth: 0 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, padding: 12, font: { size: 11 } } } } },
      });
    };
    const bar = (canvas: HTMLCanvasElement | undefined, labels: string[], values: number[], label?: string) => {
      if (!canvas || !labels.length) return null;
      return new Chart(canvas, {
        type: 'bar', data: { labels, datasets: [{ label: label || '', data: values, backgroundColor: COLORS.slice(0, labels.length), borderRadius: 4 }] },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, padding: 12, font: { size: 11 } } } },
          scales: { y: { beginAtZero: true, ticks: { font: { size: 10 } } }, x: { ticks: { font: { size: 10 }, maxRotation: 45 } } },
        },
      });
    };

    const charts: (Chart | null)[] = [
      pie(this.pie1()?.nativeElement, d.inventoryByCategory.map(x => x.label), d.inventoryByCategory.map(x => x.value)),
      pie(this.pie2()?.nativeElement, d.inventoryValueDistribution.map(x => x.label), d.inventoryValueDistribution.map(x => x.value)),
      pie(this.pie3()?.nativeElement, d.revenueDistribution.map(x => x.label), d.revenueDistribution.map(x => x.value)),
      pie(this.pie4()?.nativeElement, d.profitDistribution.map(x => x.label), d.profitDistribution.map(x => x.value)),
      pie(this.pie5()?.nativeElement, d.productStatusDistribution.map(x => x.label), d.productStatusDistribution.map(x => x.value)),
      bar(this.bar1()?.nativeElement, d.topRevenueProducts.map(x => x.label), d.topRevenueProducts.map(x => x.value), 'Revenue'),
      bar(this.bar2()?.nativeElement, d.topProfitProducts.map(x => x.label), d.topProfitProducts.map(x => x.value), 'Profit'),
      bar(this.bar3()?.nativeElement, d.stockPerProduct.map(x => x.label), d.stockPerProduct.map(x => x.value), 'Stock'),
    ];

    const b4 = d.purchaseCostVsSellingPrice;
    if (b4.length && this.bar4()) {
      charts.push(new Chart(this.bar4()!.nativeElement, {
        type: 'bar', data: {
          labels: b4.map(x => x.category),
          datasets: [
            { label: 'Purchase Cost', data: b4.map(x => x.purchaseCost), backgroundColor: '#c9a54c', borderRadius: 4 },
            { label: 'Selling Price', data: b4.map(x => x.sellingPrice), backgroundColor: '#0f6f84', borderRadius: 4 },
          ],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, padding: 12, font: { size: 11 } } } },
          scales: { y: { beginAtZero: true, ticks: { font: { size: 10 } } }, x: { ticks: { font: { size: 10 } } } },
        },
      }));
    }

    if (d.productTypeDistribution.length && this.donut()) {
      charts.push(new Chart(this.donut()!.nativeElement, {
        type: 'doughnut', data: {
          labels: d.productTypeDistribution.map(x => x.label),
          datasets: [{ data: d.productTypeDistribution.map(x => x.value), backgroundColor: COLORS.slice(0, d.productTypeDistribution.length), borderWidth: 2, borderColor: '#fff' }],
        },
        options: {
          responsive: true, maintainAspectRatio: false, cutout: '55%',
          plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, padding: 12, font: { size: 11 } } } },
        },
      }));
    }

    this.charts = charts.filter((c): c is Chart => c !== null);
  }

  private destroyCharts() {
    this.charts.forEach(c => c.destroy());
    this.charts = [];
  }

  refresh() {
    this.loading.set(true);
    this.error.set(null);
    this.loadDashboard();
  }
}
