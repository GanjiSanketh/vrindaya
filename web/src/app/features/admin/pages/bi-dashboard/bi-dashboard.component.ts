import { Component, inject, signal, viewChild, ElementRef, AfterViewInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { BIService, BIDashboardDto, ChartDataPoint } from '../../services/bi.service';
import { Chart } from 'chart.js';

const COLORS = ['#0f6f84', '#c9a54c', '#22a34a', '#9b4fe0', '#dc2626', '#b45309', '#6b7280', '#be123c', '#0891b2', '#65a30d'];

interface SeverityStyle {
  bg: string;
  border: string;
  text: string;
  icon: string;
}

@Component({
  selector: 'app-bi-dashboard',
  standalone: true,
  imports: [CommonModule, DecimalPipe],
  templateUrl: './bi-dashboard.component.html',
  styleUrl: './bi-dashboard.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BIDashboardComponent implements AfterViewInit, OnDestroy {
  readonly biSvc = inject(BIService);

  readonly data = signal<BIDashboardDto | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  private viewReady = false;
  private charts: Chart[] = [];
  private timeouts: ReturnType<typeof setTimeout>[] = [];

  readonly revenueTrendCanvas = viewChild<ElementRef<HTMLCanvasElement>>('revenueTrendCanvas');
  readonly categoryGrowthCanvas = viewChild<ElementRef<HTMLCanvasElement>>('categoryGrowthCanvas');
  readonly decliningProductsCanvas = viewChild<ElementRef<HTMLCanvasElement>>('decliningProductsCanvas');
  readonly growingProductsCanvas = viewChild<ElementRef<HTMLCanvasElement>>('growingProductsCanvas');

  constructor() {
    this.loadDashboard();
  }

  ngAfterViewInit() {
    this.viewReady = true;
    const d = this.data();
    if (d) {
      this.timeouts.push(setTimeout(() => this.renderAllCharts(d), 200));
    }
  }

  private async loadDashboard() {
    try {
      const d = await this.biSvc.getBIDashboard();
      this.data.set(d!);
      if (this.viewReady) {
        this.timeouts.push(setTimeout(() => this.renderAllCharts(d!), 200));
      }
    } catch (e: any) {
      this.error.set(e?.message ?? 'Failed to load BI dashboard data');
    } finally {
      this.loading.set(false);
    }
  }

  private async renderAllCharts(d: BIDashboardDto) {
    this.destroyCharts();
    const { Chart, registerables } = await import('chart.js');
    Chart.register(...registerables);

    const charts: (Chart | null)[] = [];

    charts.push(this.renderLineChart(
      this.revenueTrendCanvas()?.nativeElement,
      d.revenueTrend,
      'Monthly Revenue Trend',
      '#0f6f84'
    ));

    charts.push(this.renderBarChart(
      this.categoryGrowthCanvas()?.nativeElement,
      d.categoryGrowth,
      'Category Growth MoM (%)',
      '#c9a54c'
    ));

    charts.push(this.renderHorizontalBarChart(
      this.decliningProductsCanvas()?.nativeElement,
      d.topDecliningProducts,
      'Top Declining Products MoM (%)',
      '#dc2626'
    ));

    charts.push(this.renderHorizontalBarChart(
      this.growingProductsCanvas()?.nativeElement,
      d.topGrowingProducts,
      'Top Growing Products MoM (%)',
      '#22a34a'
    ));

    this.charts = charts.filter((c): c is Chart => c !== null);
  }

  private renderLineChart(
    canvas: HTMLCanvasElement | undefined,
    data: ChartDataPoint[],
    label: string,
    color: string
  ): Chart | null {
    if (!canvas || !data.length) return null;

    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, color.replace(')', ', 0.3)').replace('rgb', 'rgba').replace('#', ''));
    gradient.addColorStop(1, color.replace(')', ', 0)').replace('rgb', 'rgba').replace('#', ''));

    return new Chart(canvas, {
      type: 'line',
      data: {
        labels: data.map(x => x.label),
        datasets: [{
          label,
          data: data.map(x => x.value),
          borderColor: color,
          backgroundColor: gradient,
          fill: true,
          tension: 0.3,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: '#fff',
          pointBorderColor: color,
          pointBorderWidth: 2,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#1f2937',
            titleColor: '#fff',
            bodyColor: '#e5e7eb',
            padding: 12,
            cornerRadius: 8,
            callbacks: {
              label: (ctx) => `₹${(ctx.parsed.y ?? 0).toLocaleString('en-IN')}`,
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(0,0,0,0.05)' },
            ticks: { font: { size: 11 }, callback: (v) => '₹' + (v as number).toLocaleString('en-IN') },
          },
          x: { grid: { display: false }, ticks: { font: { size: 11 }, maxRotation: 45 } },
        },
      },
    });
  }

  private renderBarChart(
    canvas: HTMLCanvasElement | undefined,
    data: ChartDataPoint[],
    label: string,
    _color: string
  ): Chart | null {
    if (!canvas || !data.length) return null;

    const bgColors = data.map((_, i) => data[i].value >= 0
      ? COLORS[i % COLORS.length].replace(')', ', 0.7)').replace('rgb', 'rgba').replace('#', '')
      : '#dc2626'.replace(')', ', 0.7)').replace('rgb', 'rgba'));

    return new Chart(canvas, {
      type: 'bar',
      data: {
        labels: data.map(x => x.label),
        datasets: [{
          label,
          data: data.map(x => x.value),
          backgroundColor: bgColors,
          borderColor: data.map(x => x.value >= 0 ? COLORS[data.indexOf(x) % COLORS.length] : '#dc2626'),
          borderWidth: 1,
          borderRadius: 6,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#1f2937',
            titleColor: '#fff',
            bodyColor: '#e5e7eb',
            padding: 12,
            cornerRadius: 8,
            callbacks: {
              label: (ctx) => {
                const y = ctx.parsed.y ?? 0;
                return `${y >= 0 ? '+' : ''}${y.toFixed(1)}%`;
              },
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(0,0,0,0.05)' },
            ticks: { font: { size: 11 }, callback: (v) => `${v}%` },
          },
          x: { grid: { display: false }, ticks: { font: { size: 11 }, maxRotation: 45 } },
        },
      },
    });
  }

  private renderHorizontalBarChart(
    canvas: HTMLCanvasElement | undefined,
    data: ChartDataPoint[],
    label: string,
    color: string
  ): Chart | null {
    if (!canvas || !data.length) return null;

    return new Chart(canvas, {
      type: 'bar',
      data: {
        labels: data.map(x => x.label).reverse(),
        datasets: [{
          label,
          data: data.map(x => x.value).reverse(),
          backgroundColor: color.replace(')', ', 0.7)').replace('rgb', 'rgba').replace('#', ''),
          borderColor: color,
          borderWidth: 1,
          borderRadius: 6,
        }],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#1f2937',
            titleColor: '#fff',
            bodyColor: '#e5e7eb',
            padding: 12,
            cornerRadius: 8,
            callbacks: {
              label: (ctx) => {
                const x = ctx.parsed.x ?? 0;
                return `${x >= 0 ? '+' : ''}${x.toFixed(1)}%`;
              },
            },
          },
        },
        scales: {
          x: {
            beginAtZero: true,
            grid: { color: 'rgba(0,0,0,0.05)' },
            ticks: { font: { size: 11 }, callback: (v) => `${v}%` },
          },
          y: { grid: { display: false }, ticks: { font: { size: 11 } } },
        },
      },
    });
  }

  private destroyCharts() {
    this.charts.forEach(c => c.destroy());
    this.charts = [];
  }

  ngOnDestroy(): void {
    this.timeouts.forEach(t => clearTimeout(t));
    this.destroyCharts();
  }

  refresh() {
    this.loading.set(true);
    this.error.set(null);
    this.loadDashboard();
  }

  getSeverityStyle(severity: string): SeverityStyle {
    switch (severity) {
      case 'Critical': return { bg: '#fef2f2', border: '#fecaca', text: '#dc2626', icon: 'bi-x-octagon-fill' };
      case 'Warning': return { bg: '#fffbeb', border: '#fde68a', text: '#d97706', icon: 'bi-exclamation-triangle-fill' };
      case 'Opportunity': return { bg: '#ecfdf5', border: '#a7f3d0', text: '#059669', icon: 'bi-lightning-fill' };
      default: return { bg: '#eff6ff', border: '#bfdbfe', text: '#2563eb', icon: 'bi-info-circle-fill' };
    }
  }

  getInsightTypeClass(type: string): string {
    switch (type) {
      case 'Critical': return 'insight-critical';
      case 'Warning': return 'insight-warning';
      case 'Opportunity': return 'insight-opportunity';
      default: return 'insight-info';
    }
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);
  }

  formatNumber(value: number): string {
    return new Intl.NumberFormat('en-IN').format(value);
  }
}