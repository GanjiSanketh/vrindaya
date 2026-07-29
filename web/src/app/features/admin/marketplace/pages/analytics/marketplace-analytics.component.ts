import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MarketplaceLayoutComponent } from '../../layouts/marketplace-layout.component';
import { ChartComponent } from '../../../../../shared/components/chart/chart.component';
import { MarketplaceAnalyticsService, type AnalyticsStats } from '../../services/marketplace-analytics.service';

@Component({
  selector: 'app-marketplace-analytics',
  standalone: true,
  imports: [MarketplaceLayoutComponent, ChartComponent, DatePipe],
  template: `
    <app-marketplace-layout title="Marketplace Analytics" subtitle="Detailed analytics with real-time metrics, charts, and export.">
      <ng-container actions>
        <button class="btn btn-outline-secondary btn-sm" (click)="analytics.refresh()" [disabled]="analytics.loading()">
          <i class="bi bi-arrow-clockwise me-1"></i>Refresh
        </button>
        <div class="btn-group btn-group-sm">
          <button class="btn btn-outline-success" (click)="exportCSV()"><i class="bi bi-filetype-csv me-1"></i>CSV</button>
          <button class="btn btn-outline-success" (click)="exportExcel()"><i class="bi bi-file-earmark-excel me-1"></i>Excel</button>
          <button class="btn btn-outline-danger" (click)="exportPDF()"><i class="bi bi-filetype-pdf me-1"></i>PDF</button>
        </div>
      </ng-container>

      @if (analytics.loading()) {
        <div class="d-flex align-items-center gap-2 text-muted py-4">
          <span class="spinner-border spinner-border-sm"></span> Loading analytics…
        </div>
      }

      <!-- Stat Cards -->
      <div class="row g-3 mb-4">
        @for (card of cards; track card.key) {
          <div class="col-6 col-md-4 col-lg">
            <div class="card border-0 shadow-sm h-100">
              <div class="card-body d-flex align-items-center gap-3">
                <div class="rounded-3 p-3 flex-shrink-0" [style]="'background:'+card.bg">
                  <i class="bi {{ card.icon }} fs-4" [style]="'color:'+card.color"></i>
                </div>
                <div class="min-w-0">
                  <h6 class="card-subtitle text-muted mb-1 small">{{ card.label }}</h6>
                  <span class="fs-4 fw-bold">{{ getStat(card.key) }}</span>
                </div>
              </div>
            </div>
          </div>
        }
      </div>

      <!-- Charts Grid -->
      <div class="row g-3 mb-4">
        <div class="col-12 col-md-6 col-lg-4">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-header bg-transparent border-bottom-0 pt-3 pb-0"><h6 class="fs-6 fw-semibold mb-0">Marketplace Distribution</h6></div>
            <div class="card-body"><app-chart type="doughnut" [labels]="analytics.platformDistribution().labels" [data]="analytics.platformDistribution().data" datasetLabel="Listings" /></div>
          </div>
        </div>
        <div class="col-12 col-md-6 col-lg-4">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-header bg-transparent border-bottom-0 pt-3 pb-0"><h6 class="fs-6 fw-semibold mb-0">Publish Trend (7 days)</h6></div>
            <div class="card-body"><app-chart type="bar" [labels]="analytics.publishTrend().labels" [data]="analytics.publishTrend().data" datasetLabel="Published" color="#10b981" /></div>
          </div>
        </div>
        <div class="col-12 col-md-6 col-lg-4">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-header bg-transparent border-bottom-0 pt-3 pb-0"><h6 class="fs-6 fw-semibold mb-0">Sync Trend (7 days)</h6></div>
            <div class="card-body"><app-chart type="line" [labels]="analytics.syncTrend().labels" [data]="analytics.syncTrend().data" datasetLabel="Syncs" color="#0f6f84" /></div>
          </div>
        </div>
        <div class="col-12 col-md-6 col-lg-4">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-header bg-transparent border-bottom-0 pt-3 pb-0"><h6 class="fs-6 fw-semibold mb-0">Failure Reasons</h6></div>
            <div class="card-body"><app-chart type="horizontalBar" [labels]="analytics.failureReasons().labels" [data]="analytics.failureReasons().data" datasetLabel="Count" color="#dc2626" /></div>
          </div>
        </div>
        <div class="col-12 col-md-6 col-lg-4">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-header bg-transparent border-bottom-0 pt-3 pb-0"><h6 class="fs-6 fw-semibold mb-0">Inventory Value (by Platform)</h6></div>
            <div class="card-body"><app-chart type="bar" [labels]="analytics.inventoryValue().labels" [data]="analytics.inventoryValue().data" datasetLabel="Value (₹)" color="#2563eb" /></div>
          </div>
        </div>
        <div class="col-12 col-md-6 col-lg-4">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-header bg-transparent border-bottom-0 pt-3 pb-0"><h6 class="fs-6 fw-semibold mb-0">Top Products by Inventory Value</h6></div>
            <div class="card-body"><app-chart type="horizontalBar" [labels]="analytics.topProducts().labels" [data]="analytics.topProducts().data" datasetLabel="Value (₹)" color="#c9a54c" /></div>
          </div>
        </div>
      </div>

      <!-- Export Status & Last Updated -->
      <div class="d-flex justify-content-between align-items-center">
        <small class="text-muted">Last updated: {{ analytics.lastUpdated() | date:'medium' }}</small>
        <small class="text-muted">{{ analytics.stats().totalListings }} listings · {{ analytics.stats().published }} published</small>
      </div>
    </app-marketplace-layout>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MarketplaceAnalyticsComponent {
  readonly analytics = inject(MarketplaceAnalyticsService);

  readonly cards = [
    { key: 'published' as const, label: 'Published', icon: 'bi-check-circle', color: '#22a34a', bg: '#e8f5e9' },
    { key: 'draft' as const, label: 'Draft', icon: 'bi-pencil', color: '#6c757d', bg: '#f0f0f0' },
    { key: 'failed' as const, label: 'Failed', icon: 'bi-x-circle', color: '#dc2626', bg: '#fde8e8' },
    { key: 'pending' as const, label: 'Pending', icon: 'bi-clock', color: '#b45309', bg: '#fff3e0' },
    { key: 'outOfStock' as const, label: 'Out Of Stock', icon: 'bi-box', color: '#1a1a2e', bg: '#e8e8ee' },
  ];

  getStat(key: keyof AnalyticsStats): number {
    return this.analytics.stats()[key];
  }

  private exportData(): { title: string; headers: string[]; rows: string[][] }[] {
    const s = this.analytics.stats();
    const sections: { title: string; headers: string[]; rows: string[][] }[] = [];

    sections.push({
      title: 'Summary Metrics',
      headers: ['Metric', 'Value'],
      rows: [
        ['Total Listings', String(s.totalListings)],
        ['Published', String(s.published)],
        ['Draft', String(s.draft)],
        ['Failed', String(s.failed)],
        ['Pending', String(s.pending)],
        ['Out of Stock', String(s.outOfStock)],
      ],
    });

    const addChart = (title: string, ds: { labels: string[]; data: number[] }, headers: string[]) => {
      sections.push({
        title,
        headers,
        rows: ds.labels.map((l, i) => [l, String(ds.data[i] ?? 0)]),
      });
    };

    addChart('Marketplace Distribution', this.analytics.platformDistribution(), ['Platform', 'Listings']);
    addChart('Publish Trend (7 days)', this.analytics.publishTrend(), ['Date', 'Published']);
    addChart('Sync Trend (7 days)', this.analytics.syncTrend(), ['Date', 'Syncs']);
    addChart('Failure Reasons', this.analytics.failureReasons(), ['Error', 'Count']);
    addChart('Inventory Value by Platform', this.analytics.inventoryValue(), ['Platform', 'Value (₹)']);
    addChart('Top Products by Inventory Value', this.analytics.topProducts(), ['Product', 'Value (₹)']);

    return sections;
  }

  exportCSV(): void {
    const lines: string[] = [];
    for (const sec of this.exportData()) {
      lines.push(`"${sec.title}"`);
      lines.push(sec.headers.map(h => `"${h}"`).join(','));
      for (const row of sec.rows) lines.push(row.map(c => `"${c}"`).join(','));
      lines.push('');
    }
    this.download(lines.join('\n'), 'text/csv;charset=utf-8;', 'csv');
  }

  exportExcel(): void {
    const rows: string[] = ['<html><head><meta charset="utf-8"><style>th{background:#0f6f84;color:#fff;padding:6px 10px;font-weight:600}td{padding:4px 10px}table{border-collapse:collapse;margin-bottom:16px;width:auto}h3{color:#1a1a2e;font-family:sans-serif}</style></head><body>'];
    rows.push(`<h2>Marketplace Analytics</h2><p>Generated: ${new Date().toLocaleString()}</p>`);
    for (const sec of this.exportData()) {
      rows.push(`<h3>${sec.title}</h3><table border="1"><tr>${sec.headers.map(h => `<th>${h}</th>`).join('')}</tr>`);
      for (const r of sec.rows) rows.push(`<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`);
      rows.push('</table>');
    }
    rows.push('</body></html>');
    this.download(rows.join('\n'), 'application/vnd.ms-excel', 'xls');
  }

  exportPDF(): void {
    const rows: string[] = ['<html><head><meta charset="utf-8"><style>body{font-family:sans-serif;padding:20px;color:#333}table{border-collapse:collapse;width:100%;margin-bottom:20px}th{background:#0f6f84;color:#fff;padding:6px 10px;text-align:left}td{padding:4px 10px;border:1px solid #ddd}h2{color:#1a1a2e;margin-top:24px}h3{color:#0f6f84;margin:16px 0 8px}@media print{body{padding:0}}</style></head><body>'];
    rows.push(`<h2>Marketplace Analytics</h2><p>Generated: ${new Date().toLocaleString()}</p>`);
    for (const sec of this.exportData()) {
      rows.push(`<h3>${sec.title}</h3><table><thead><tr>${sec.headers.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>`);
      for (const r of sec.rows) rows.push(`<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`);
      rows.push('</tbody></table>');
    }
    rows.push(`<p style="margin-top:32px;color:#999;font-size:11px">Vrindaya Marketplace Analytics · ${new Date().toLocaleString()}</p>`);
    rows.push('</body></html>');

    const win = window.open('', '_blank');
    if (win) {
      win.document.write(rows.join('\n'));
      win.document.close();
      win.focus();
      setTimeout(() => { win.print(); }, 300);
    }
  }

  private download(content: string, mime: string, ext: string): void {
    const blob = new Blob([content], { type: `${mime};charset=utf-8;` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `marketplace-analytics-${new Date().toISOString().slice(0, 10)}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
