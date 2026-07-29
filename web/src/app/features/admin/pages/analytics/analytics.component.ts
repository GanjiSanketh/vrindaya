import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { DecimalPipe, NgTemplateOutlet } from '@angular/common';
import { ChartComponent } from '../../../../shared/components/chart/chart.component';
import { AnalyticsService } from '../../services/analytics.service';
import type { ChartDataset } from '../../marketplace/models/chart.model';

type TabId = 'sales' | 'products' | 'categories' | 'marketplace' | 'ai' | 'traffic' | 'conversion' | 'performance';

interface TabDef { id: TabId; label: string; icon: string; }

const TABS: TabDef[] = [
  { id: 'sales', label: 'Sales Dashboard', icon: 'bi-graph-up-arrow' },
  { id: 'products', label: 'Product Analytics', icon: 'bi-box-seam' },
  { id: 'categories', label: 'Category Analytics', icon: 'bi-tags' },
  { id: 'marketplace', label: 'Marketplace Ops', icon: 'bi-shop-window' },
  { id: 'ai', label: 'AI Analytics', icon: 'bi-cpu' },
  { id: 'traffic', label: 'Traffic Analytics', icon: 'bi-people' },
  { id: 'conversion', label: 'Conversion Analytics', icon: 'bi-arrow-left-right' },
  { id: 'performance', label: 'Performance Dashboard', icon: 'bi-speedometer2' },
];

const PALETTE = ['#0f6f84', '#c9a54c', '#22a34a', '#9b4fe0', '#dc2626', '#b45309', '#2563eb', '#db2777'];

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [ChartComponent, DecimalPipe, NgTemplateOutlet],
  template: `
    <div class="an-page">
      <div class="an-header">
        <div>
          <h1 class="an-title">Analytics</h1>
          <p class="an-sub">Comprehensive analytics with real-time metrics, charts, and export for all marketplace data.</p>
        </div>
        <div class="an-actions">
          <button class="btn btn-outline-secondary btn-sm" (click)="svc.refresh()" [disabled]="svc.loading()">
            <i class="bi bi-arrow-clockwise me-1"></i>Refresh
          </button>
          <div class="btn-group btn-group-sm">
            <button class="btn btn-outline-success" (click)="exportCSV()"><i class="bi bi-filetype-csv me-1"></i>CSV</button>
            <button class="btn btn-outline-success" (click)="exportExcel()"><i class="bi bi-file-earmark-excel me-1"></i>Excel</button>
            <button class="btn btn-outline-danger" (click)="exportPDF()"><i class="bi bi-filetype-pdf me-1"></i>PDF</button>
          </div>
        </div>
      </div>

      <div class="an-tabs">
        @for (tab of tabs; track tab.id) {
          <button class="an-tab" [class.active]="activeTab() === tab.id" (click)="activeTab.set(tab.id)">
            <i class="bi {{ tab.icon }}"></i>
            <span>{{ tab.label }}</span>
          </button>
        }
      </div>

      @if (svc.loading()) {
        <div class="d-flex align-items-center gap-2 text-muted py-4">
          <span class="spinner-border spinner-border-sm"></span> Loading analytics…
        </div>
      }

      <div class="an-content">
        @switch (activeTab()) {
          @case ('sales') { <ng-container *ngTemplateOutlet="salesTpl" /> }
          @case ('products') { <ng-container *ngTemplateOutlet="productTpl" /> }
          @case ('categories') { <ng-container *ngTemplateOutlet="categoryTpl" /> }
          @case ('marketplace') { <ng-container *ngTemplateOutlet="marketplaceTpl" /> }
          @case ('ai') { <ng-container *ngTemplateOutlet="aiTpl" /> }
          @case ('traffic') { <ng-container *ngTemplateOutlet="trafficTpl" /> }
          @case ('conversion') { <ng-container *ngTemplateOutlet="conversionTpl" /> }
          @case ('performance') { <ng-container *ngTemplateOutlet="perfTpl" /> }
        }
      </div>
    </div>

    <!-- ─── SALES DASHBOARD ─── -->
    <ng-template #salesTpl>
      <div class="row g-3 mb-4">
        @for (card of salesCards; track card.key) {
          <div class="col-6 col-md-4 col-lg-2">
            <div class="card border-0 shadow-sm h-100">
              <div class="card-body d-flex align-items-center gap-3">
                <div class="rounded-3 p-3 flex-shrink-0" [style]="'background:'+card.bg">
                  <i class="bi {{ card.icon }} fs-4" [style]="'color:'+card.color"></i>
                </div>
                <div class="min-w-0">
                  <h6 class="card-subtitle text-muted mb-1 small">{{ card.label }}</h6>
                  <span class="fs-4 fw-bold">{{ card.prefix }}{{ svc.salesStats()[card.key] | number:card.format }}</span>
                </div>
              </div>
            </div>
          </div>
        }
      </div>
      <div class="row g-3 mb-4">
        <div class="col-12 col-md-6 col-lg-4">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-header bg-transparent border-bottom-0 pt-3 pb-0"><h6 class="fs-6 fw-semibold mb-0">Revenue by Platform</h6></div>
            <div class="card-body"><app-chart type="bar" [labels]="svc.revenueByPlatform().labels" [data]="svc.revenueByPlatform().data" datasetLabel="Revenue (₹)" color="#0f6f84" /></div>
          </div>
        </div>
        <div class="col-12 col-md-6 col-lg-4">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-header bg-transparent border-bottom-0 pt-3 pb-0"><h6 class="fs-6 fw-semibold mb-0">Sales Trend (7 days)</h6></div>
            <div class="card-body"><app-chart type="line" [labels]="svc.salesTrend().labels" [data]="svc.salesTrend().data" datasetLabel="Published" color="#22a34a" /></div>
          </div>
        </div>
        <div class="col-12 col-md-6 col-lg-4">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-header bg-transparent border-bottom-0 pt-3 pb-0"><h6 class="fs-6 fw-semibold mb-0">Status Distribution</h6></div>
            <div class="card-body"><app-chart type="doughnut" [labels]="svc.salesStatusDist().labels" [data]="svc.salesStatusDist().data" datasetLabel="Listings" /></div>
          </div>
        </div>
      </div>
      <div class="card border-0 shadow-sm">
        <div class="card-header bg-transparent border-bottom-0 pt-3 pb-0"><h6 class="fs-6 fw-semibold mb-0">Top Products by Inventory Value</h6></div>
        <div class="card-body"><app-chart type="horizontalBar" [labels]="svc.topProductsByValue().labels" [data]="svc.topProductsByValue().data" datasetLabel="Value (₹)" color="#c9a54c" /></div>
      </div>
    </ng-template>

    <!-- ─── PRODUCT ANALYTICS ─── -->
    <ng-template #productTpl>
      <div class="row g-3 mb-4">
        <div class="col-6 col-md-3">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-body d-flex align-items-center gap-3">
              <div class="rounded-3 p-3 flex-shrink-0" style="background:#e8f5e9"><i class="bi bi-box-seam fs-4 text-success"></i></div>
              <div><h6 class="card-subtitle text-muted mb-1 small">Total Products</h6><span class="fs-4 fw-bold">{{ svc.productStats().totalProducts }}</span></div>
            </div>
          </div>
        </div>
        <div class="col-6 col-md-3">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-body d-flex align-items-center gap-3">
              <div class="rounded-3 p-3 flex-shrink-0" style="background:#e3f2fd"><i class="bi bi-card-list fs-4 text-primary"></i></div>
              <div><h6 class="card-subtitle text-muted mb-1 small">Total Listings</h6><span class="fs-4 fw-bold">{{ svc.productStats().totalListings }}</span></div>
            </div>
          </div>
        </div>
        <div class="col-6 col-md-3">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-body d-flex align-items-center gap-3">
              <div class="rounded-3 p-3 flex-shrink-0" style="background:#fff3e0"><i class="bi bi-link-45deg fs-4 text-warning"></i></div>
              <div><h6 class="card-subtitle text-muted mb-1 small">With Listings</h6><span class="fs-4 fw-bold">{{ svc.productStats().withListings }}</span></div>
            </div>
          </div>
        </div>
        <div class="col-6 col-md-3">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-body d-flex align-items-center gap-3">
              <div class="rounded-3 p-3 flex-shrink-0" style="background:#fce4ec"><i class="bi bi-unlink fs-4 text-danger"></i></div>
              <div><h6 class="card-subtitle text-muted mb-1 small">Without Listings</h6><span class="fs-4 fw-bold">{{ svc.productStats().withoutListings }}</span></div>
            </div>
          </div>
        </div>
      </div>
      <div class="row g-3">
        <div class="col-12 col-md-6">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-header bg-transparent border-bottom-0 pt-3 pb-0"><h6 class="fs-6 fw-semibold mb-0">Listings by Platform</h6></div>
            <div class="card-body"><app-chart type="bar" [labels]="svc.productsByPlatform().labels" [data]="svc.productsByPlatform().data" datasetLabel="Listings" color="#0f6f84" /></div>
          </div>
        </div>
        <div class="col-12 col-md-6">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-header bg-transparent border-bottom-0 pt-3 pb-0"><h6 class="fs-6 fw-semibold mb-0">Listing Growth (30 days)</h6></div>
            <div class="card-body"><app-chart type="line" [labels]="svc.listingGrowth().labels" [data]="svc.listingGrowth().data" datasetLabel="New Listings" color="#2563eb" /></div>
          </div>
        </div>
      </div>
    </ng-template>

    <!-- ─── CATEGORY ANALYTICS ─── -->
    <ng-template #categoryTpl>
      <div class="row g-3 mb-4">
        <div class="col-6 col-md-3">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-body d-flex align-items-center gap-3">
              <div class="rounded-3 p-3 flex-shrink-0" style="background:#e8f5e9"><i class="bi bi-tags fs-4 text-success"></i></div>
              <div><h6 class="card-subtitle text-muted mb-1 small">Categories</h6><span class="fs-4 fw-bold">{{ svc.categoryStats().totalCategories }}</span></div>
            </div>
          </div>
        </div>
        <div class="col-6 col-md-3">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-body d-flex align-items-center gap-3">
              <div class="rounded-3 p-3 flex-shrink-0" style="background:#fff3e0"><i class="bi bi-trophy fs-4 text-warning"></i></div>
              <div><h6 class="card-subtitle text-muted mb-1 small">Top Category</h6><span class="fs-5 fw-bold text-truncate d-block" style="max-width:120px">{{ svc.categoryStats().topCategory || '—' }}</span></div>
            </div>
          </div>
        </div>
        <div class="col-6 col-md-3">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-body d-flex align-items-center gap-3">
              <div class="rounded-3 p-3 flex-shrink-0" style="background:#e3f2fd"><i class="bi bi-bar-chart fs-4 text-primary"></i></div>
              <div><h6 class="card-subtitle text-muted mb-1 small">Top Cat. Products</h6><span class="fs-4 fw-bold">{{ svc.categoryStats().topCategoryCount }}</span></div>
            </div>
          </div>
        </div>
      </div>
      <div class="row g-3">
        <div class="col-12 col-md-6">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-header bg-transparent border-bottom-0 pt-3 pb-0"><h6 class="fs-6 fw-semibold mb-0">Category Distribution</h6></div>
            <div class="card-body"><app-chart type="doughnut" [labels]="svc.categoryDistribution().labels" [data]="svc.categoryDistribution().data" datasetLabel="Products" /></div>
          </div>
        </div>
        <div class="col-12 col-md-6">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-header bg-transparent border-bottom-0 pt-3 pb-0"><h6 class="fs-6 fw-semibold mb-0">Products by Category</h6></div>
            <div class="card-body">
              <div class="table-responsive" style="max-height:300px">
                <table class="table table-sm table-hover mb-0">
                  <thead><tr><th>Category</th><th class="text-end">Products</th><th class="text-end">%</th></tr></thead>
                  <tbody>
                    @for (label of svc.categoryDistribution().labels; track $index; let i = $index) {
                      <tr>
                        <td><span class="badge" [style.background]="palette[i % palette.length]">{{ svc.categoryDistribution().labels[i] }}</span></td>
                        <td class="text-end">{{ svc.categoryDistribution().data[i] }}</td>
                        <td class="text-end">{{ pct(svc.categoryDistribution().data[i], totalCat) }}%</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ng-template>

    <!-- ─── MARKETPLACE OPS ─── -->
    <ng-template #marketplaceTpl>
      <div class="row g-3 mb-4">
        @for (card of marketplaceCards; track card.key) {
          <div class="col-6 col-md-4 col-lg">
            <div class="card border-0 shadow-sm h-100">
              <div class="card-body d-flex align-items-center gap-3">
                <div class="rounded-3 p-3 flex-shrink-0" [style]="'background:'+card.bg">
                  <i class="bi {{ card.icon }} fs-4" [style]="'color:'+card.color"></i>
                </div>
                <div class="min-w-0">
                  <h6 class="card-subtitle text-muted mb-1 small">{{ card.label }}</h6>
                  <span class="fs-4 fw-bold">{{ svc.marketplaceStats()[card.key] }}</span>
                </div>
              </div>
            </div>
          </div>
        }
      </div>
      <div class="row g-3 mb-4">
        <div class="col-12 col-md-6 col-lg-4">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-header bg-transparent border-bottom-0 pt-3 pb-0"><h6 class="fs-6 fw-semibold mb-0">Platform Distribution</h6></div>
            <div class="card-body"><app-chart type="doughnut" [labels]="svc.platformDistribution().labels" [data]="svc.platformDistribution().data" datasetLabel="Listings" /></div>
          </div>
        </div>
        <div class="col-12 col-md-6 col-lg-4">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-header bg-transparent border-bottom-0 pt-3 pb-0"><h6 class="fs-6 fw-semibold mb-0">Publish Trend (7 days)</h6></div>
            <div class="card-body"><app-chart type="bar" [labels]="svc.publishTrend().labels" [data]="svc.publishTrend().data" datasetLabel="Published" color="#10b981" /></div>
          </div>
        </div>
        <div class="col-12 col-md-6 col-lg-4">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-header bg-transparent border-bottom-0 pt-3 pb-0"><h6 class="fs-6 fw-semibold mb-0">Sync Trend (7 days)</h6></div>
            <div class="card-body"><app-chart type="line" [labels]="svc.syncTrend().labels" [data]="svc.syncTrend().data" datasetLabel="Syncs" color="#0f6f84" /></div>
          </div>
        </div>
        <div class="col-12 col-md-6 col-lg-4">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-header bg-transparent border-bottom-0 pt-3 pb-0"><h6 class="fs-6 fw-semibold mb-0">Failure Reasons</h6></div>
            <div class="card-body"><app-chart type="horizontalBar" [labels]="svc.failureReasons().labels" [data]="svc.failureReasons().data" datasetLabel="Count" color="#dc2626" /></div>
          </div>
        </div>
        <div class="col-12 col-md-6 col-lg-4">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-header bg-transparent border-bottom-0 pt-3 pb-0"><h6 class="fs-6 fw-semibold mb-0">Inventory Value (by Platform)</h6></div>
            <div class="card-body"><app-chart type="bar" [labels]="svc.inventoryValue().labels" [data]="svc.inventoryValue().data" datasetLabel="Value (₹)" color="#2563eb" /></div>
          </div>
        </div>
        <div class="col-12 col-md-6 col-lg-4">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-header bg-transparent border-bottom-0 pt-3 pb-0"><h6 class="fs-6 fw-semibold mb-0">Top Products by Value</h6></div>
            <div class="card-body"><app-chart type="horizontalBar" [labels]="svc.topProducts().labels" [data]="svc.topProducts().data" datasetLabel="Value (₹)" color="#c9a54c" /></div>
          </div>
        </div>
      </div>
    </ng-template>

    <!-- ─── AI ANALYTICS ─── -->
    <ng-template #aiTpl>
      <div class="row g-3 mb-4">
        @for (card of aiCards; track card.key) {
          <div class="col-6 col-md-3">
            <div class="card border-0 shadow-sm h-100">
              <div class="card-body d-flex align-items-center gap-3">
                <div class="rounded-3 p-3 flex-shrink-0" [style]="'background:'+card.bg">
                  <i class="bi {{ card.icon }} fs-4" [style]="'color:'+card.color"></i>
                </div>
                <div class="min-w-0">
                  <h6 class="card-subtitle text-muted mb-1 small">{{ card.label }}</h6>
                  <span class="fs-4 fw-bold">{{ svc.aiStats()[card.key] }}</span>
                </div>
              </div>
            </div>
          </div>
        }
      </div>
      <div class="row g-3">
        <div class="col-12 col-md-6">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-header bg-transparent border-bottom-0 pt-3 pb-0"><h6 class="fs-6 fw-semibold mb-0">AI Usage Distribution</h6></div>
            <div class="card-body"><app-chart type="doughnut" [labels]="svc.aiDistribution().labels" [data]="svc.aiDistribution().data" datasetLabel="Listings" /></div>
          </div>
        </div>
        <div class="col-12 col-md-6">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-header bg-transparent border-bottom-0 pt-3 pb-0"><h6 class="fs-6 fw-semibold mb-0">AI Listings by Platform</h6></div>
            <div class="card-body"><app-chart type="bar" [labels]="svc.aiByPlatform().labels" [data]="svc.aiByPlatform().data" datasetLabel="AI Listings" color="#9b4fe0" /></div>
          </div>
        </div>
      </div>
    </ng-template>

    <!-- ─── TRAFFIC ANALYTICS ─── -->
    <ng-template #trafficTpl>
      <div class="row g-3 mb-4">
        <div class="col-6 col-md-3">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-body d-flex align-items-center gap-3">
              <div class="rounded-3 p-3 flex-shrink-0" style="background:#e3f2fd"><i class="bi bi-journal-text fs-4 text-primary"></i></div>
              <div><h6 class="card-subtitle text-muted mb-1 small">Total Log Entries</h6><span class="fs-4 fw-bold">{{ svc.trafficStats().totalLogs }}</span></div>
            </div>
          </div>
        </div>
        <div class="col-6 col-md-3">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-body d-flex align-items-center gap-3">
              <div class="rounded-3 p-3 flex-shrink-0" style="background:#f3e8ff"><i class="bi bi-diagram-3 fs-4" style="color:#9333ea"></i></div>
              <div><h6 class="card-subtitle text-muted mb-1 small">Event Types</h6><span class="fs-4 fw-bold">{{ svc.trafficStats().uniqueTypes }}</span></div>
            </div>
          </div>
        </div>
      </div>
      <div class="row g-3">
        <div class="col-12 col-md-6">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-header bg-transparent border-bottom-0 pt-3 pb-0"><h6 class="fs-6 fw-semibold mb-0">Events by Type</h6></div>
            <div class="card-body"><app-chart type="doughnut" [labels]="svc.trafficByType().labels" [data]="svc.trafficByType().data" datasetLabel="Events" /></div>
          </div>
        </div>
        <div class="col-12 col-md-6">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-header bg-transparent border-bottom-0 pt-3 pb-0"><h6 class="fs-6 fw-semibold mb-0">Event Timeline (7 days)</h6></div>
            <div class="card-body"><app-chart type="line" [labels]="svc.trafficTimeline().labels" [data]="svc.trafficTimeline().data" datasetLabel="Events" color="#0f6f84" /></div>
          </div>
        </div>
      </div>
    </ng-template>

    <!-- ─── CONVERSION ANALYTICS ─── -->
    <ng-template #conversionTpl>
      <div class="row g-3 mb-4">
        @for (card of conversionCards; track card.key) {
          <div class="col-6 col-md-4 col-lg">
            <div class="card border-0 shadow-sm h-100">
              <div class="card-body d-flex align-items-center gap-3">
                <div class="rounded-3 p-3 flex-shrink-0" [style]="'background:'+card.bg">
                  <i class="bi {{ card.icon }} fs-4" [style]="'color:'+card.color"></i>
                </div>
                <div class="min-w-0">
                  <h6 class="card-subtitle text-muted mb-1 small">{{ card.label }}</h6>
                  <span class="fs-4 fw-bold">{{ card.suffix }}{{ svc.conversionStats()[card.key] }}{{ card.suffix2 }}</span>
                </div>
              </div>
            </div>
          </div>
        }
      </div>
      <div class="row g-3">
        <div class="col-12 col-md-8">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-header bg-transparent border-bottom-0 pt-3 pb-0"><h6 class="fs-6 fw-semibold mb-0">Listing Funnel</h6></div>
            <div class="card-body"><app-chart type="bar" [labels]="svc.conversionFunnel().labels" [data]="svc.conversionFunnel().data" datasetLabel="Count" color="#0f6f84" /></div>
          </div>
        </div>
        <div class="col-12 col-md-4">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-header bg-transparent border-bottom-0 pt-3 pb-0"><h6 class="fs-6 fw-semibold mb-0">Status Overview</h6></div>
            <div class="card-body"><app-chart type="doughnut" [labels]="svc.salesStatusDist().labels" [data]="svc.salesStatusDist().data" datasetLabel="Listings" /></div>
          </div>
        </div>
      </div>
    </ng-template>

    <!-- ─── PERFORMANCE DASHBOARD ─── -->
    <ng-template #perfTpl>
      <div class="row g-3 mb-4">
        <div class="col-6 col-md-3">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-body text-center">
              <h6 class="text-muted small mb-1">Total Listings</h6>
              <span class="fs-3 fw-bold">{{ svc.salesStats().totalListings }}</span>
            </div>
          </div>
        </div>
        <div class="col-6 col-md-3">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-body text-center">
              <h6 class="text-muted small mb-1">Total Products</h6>
              <span class="fs-3 fw-bold">{{ svc.productStats().totalProducts }}</span>
            </div>
          </div>
        </div>
        <div class="col-6 col-md-3">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-body text-center">
              <h6 class="text-muted small mb-1">Categories</h6>
              <span class="fs-3 fw-bold">{{ svc.categoryStats().totalCategories }}</span>
            </div>
          </div>
        </div>
        <div class="col-6 col-md-3">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-body text-center">
              <h6 class="text-muted small mb-1">Conversion Rate</h6>
              <span class="fs-3 fw-bold text-success">{{ svc.conversionStats().conversionRate }}%</span>
            </div>
          </div>
        </div>
      </div>
      <div class="row g-3">
        <div class="col-12 col-md-4">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-header bg-transparent border-bottom-0 pt-3 pb-0"><h6 class="fs-6 fw-semibold mb-0">Platform Distribution</h6></div>
            <div class="card-body"><app-chart type="doughnut" [labels]="svc.perfPlatformDist().labels" [data]="svc.perfPlatformDist().data" datasetLabel="Listings" /></div>
          </div>
        </div>
        <div class="col-12 col-md-4">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-header bg-transparent border-bottom-0 pt-3 pb-0"><h6 class="fs-6 fw-semibold mb-0">Status Overview</h6></div>
            <div class="card-body"><app-chart type="doughnut" [labels]="svc.perfStatusOverview().labels" [data]="svc.perfStatusOverview().data" datasetLabel="Listings" /></div>
          </div>
        </div>
        <div class="col-12 col-md-4">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-header bg-transparent border-bottom-0 pt-3 pb-0"><h6 class="fs-6 fw-semibold mb-0">Category Distribution</h6></div>
            <div class="card-body"><app-chart type="doughnut" [labels]="svc.perfCategoryDist().labels" [data]="svc.perfCategoryDist().data" datasetLabel="Products" /></div>
          </div>
        </div>
      </div>
      <div class="row g-3 mt-2">
        <div class="col-12">
          <div class="card border-0 shadow-sm">
            <div class="card-header bg-transparent border-bottom-0 pt-3 pb-0"><h6 class="fs-6 fw-semibold mb-0">Key Metrics Summary</h6></div>
            <div class="card-body p-0">
              <div class="table-responsive">
                <table class="table table-sm table-hover mb-0">
                  <thead><tr><th>Metric</th><th class="text-end">Value</th></tr></thead>
                  <tbody>
                    <tr><td>Inventory Value (₹)</td><td class="text-end fw-bold">{{ totalRevenue | number:'1.0-0' }}</td></tr>
                    <tr><td>Published / Total</td><td class="text-end fw-bold">{{ svc.marketplaceStats().published }} / {{ svc.marketplaceStats().totalListings }}</td></tr>
                    <tr><td>AI-Powered Listings</td><td class="text-end fw-bold">{{ svc.aiStats().aiGenerated + svc.aiStats().aiOptimized }}</td></tr>
                    <tr><td>Top Category</td><td class="text-end fw-bold">{{ svc.categoryStats().topCategory || '—' }} ({{ svc.categoryStats().topCategoryCount }})</td></tr>
                    <tr><td>Log Events</td><td class="text-end fw-bold">{{ svc.trafficStats().totalLogs }}</td></tr>
                    <tr><td>Out of Stock</td><td class="text-end fw-bold text-danger">{{ svc.marketplaceStats().outOfStock }}</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ng-template>
  `,
  styleUrl: './analytics.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnalyticsComponent {
  readonly svc = inject(AnalyticsService);
  readonly tabs = TABS;
  readonly activeTab = signal<TabId>('sales');
  readonly palette = PALETTE;

  readonly salesCards = [
    { key: 'totalRevenue' as const, label: 'Inventory Value', icon: 'bi-currency-rupee', color: '#22a34a', bg: '#e8f5e9', prefix: '₹', format: '1.0-0' as const },
    { key: 'activeListings' as const, label: 'Active Listings', icon: 'bi-check-circle', color: '#0f6f84', bg: '#e0f2f5', prefix: '', format: '1.0-0' as const },
    { key: 'pendingListings' as const, label: 'Pending', icon: 'bi-clock', color: '#b45309', bg: '#fff3e0', prefix: '', format: '1.0-0' as const },
    { key: 'outOfStock' as const, label: 'Out of Stock', icon: 'bi-box', color: '#dc2626', bg: '#fce4ec', prefix: '', format: '1.0-0' as const },
    { key: 'totalProducts' as const, label: 'Products', icon: 'bi-box-seam', color: '#2563eb', bg: '#e3f2fd', prefix: '', format: '1.0-0' as const },
    { key: 'totalListings' as const, label: 'Total Listings', icon: 'bi-card-list', color: '#9b4fe0', bg: '#f3e8ff', prefix: '', format: '1.0-0' as const },
  ];

  readonly marketplaceCards = [
    { key: 'totalListings' as const, label: 'Total Listings', icon: 'bi-card-list', color: '#0f6f84', bg: '#e0f2f5' },
    { key: 'published' as const, label: 'Published', icon: 'bi-check-circle', color: '#22a34a', bg: '#e8f5e9' },
    { key: 'draft' as const, label: 'Draft', icon: 'bi-pencil', color: '#6c757d', bg: '#f0f0f0' },
    { key: 'failed' as const, label: 'Failed', icon: 'bi-x-circle', color: '#dc2626', bg: '#fde8e8' },
    { key: 'pending' as const, label: 'Pending', icon: 'bi-clock', color: '#b45309', bg: '#fff3e0' },
    { key: 'outOfStock' as const, label: 'Out Of Stock', icon: 'bi-box', color: '#1a1a2e', bg: '#e8e8ee' },
  ];

  readonly aiCards = [
    { key: 'aiGenerated' as const, label: 'AI Generated', icon: 'bi-magic', color: '#9b4fe0', bg: '#f3e8ff' },
    { key: 'aiOptimized' as const, label: 'AI Optimized', icon: 'bi-wand', color: '#0f6f84', bg: '#e0f2f5' },
    { key: 'manual' as const, label: 'Manual', icon: 'bi-person', color: '#6c757d', bg: '#f0f0f0' },
    { key: 'notApplicable' as const, label: 'Not Applicable', icon: 'bi-dash-circle', color: '#b45309', bg: '#fff3e0' },
  ];

  readonly conversionCards = [
    { key: 'totalListings' as const, label: 'Total Listings', icon: 'bi-card-list', color: '#0f6f84', bg: '#e0f2f5', suffix: '', suffix2: '' },
    { key: 'published' as const, label: 'Published', icon: 'bi-check-circle', color: '#22a34a', bg: '#e8f5e9', suffix: '', suffix2: '' },
    { key: 'conversionRate' as const, label: 'Conversion Rate', icon: 'bi-graph-up', color: '#2563eb', bg: '#e3f2fd', suffix: '', suffix2: '%' },
    { key: 'failed' as const, label: 'Failed', icon: 'bi-x-circle', color: '#dc2626', bg: '#fde8e8', suffix: '', suffix2: '' },
  ];

  get totalCat(): number {
    return this.svc.categoryDistribution().data.reduce((a, b) => a + b, 0);
  }

  get totalRevenue(): number {
    return this.svc.salesStats().totalRevenue;
  }

  pct(v: number, total: number): string {
    return total > 0 ? ((v / total) * 100).toFixed(1) : '0.0';
  }

  private exportData(): { title: string; headers: string[]; rows: string[][] }[] {
    const sections: { title: string; headers: string[]; rows: string[][] }[] = [];
    const add = (title: string, headers: string[], rows: string[][]) => sections.push({ title, headers, rows });

    add('Sales Dashboard - Summary Stats', ['Metric', 'Value'], [
      ['Inventory Value', '₹' + this.svc.salesStats().totalRevenue.toLocaleString()],
      ['Active Listings', String(this.svc.salesStats().activeListings)],
      ['Pending Listings', String(this.svc.salesStats().pendingListings)],
      ['Out of Stock', String(this.svc.salesStats().outOfStock)],
      ['Total Products', String(this.svc.salesStats().totalProducts)],
      ['Total Listings', String(this.svc.salesStats().totalListings)],
    ]);
    add('Revenue by Platform', ['Platform', 'Revenue (₹)'],
      this.svc.revenueByPlatform().labels.map((l, i) => [l, '₹' + (this.svc.revenueByPlatform().data[i] ?? 0).toLocaleString()]));
    add('Product Analytics', ['Metric', 'Value'], [
      ['Total Products', String(this.svc.productStats().totalProducts)],
      ['Total Listings', String(this.svc.productStats().totalListings)],
    ]);
    add('Category Distribution', ['Category', 'Count'],
      this.svc.categoryDistribution().labels.map((l, i) => [l, String(this.svc.categoryDistribution().data[i] ?? 0)]));
    add('Marketplace Summary', ['Metric', 'Value'], [
      ['Total Listings', String(this.svc.marketplaceStats().totalListings)],
      ['Published', String(this.svc.marketplaceStats().published)],
      ['Draft', String(this.svc.marketplaceStats().draft)],
      ['Failed', String(this.svc.marketplaceStats().failed)],
      ['Pending', String(this.svc.marketplaceStats().pending)],
      ['Out of Stock', String(this.svc.marketplaceStats().outOfStock)],
    ]);
    add('AI Analytics Summary', ['Metric', 'Value'], [
      ['AI Generated', String(this.svc.aiStats().aiGenerated)],
      ['AI Optimized', String(this.svc.aiStats().aiOptimized)],
      ['Manual', String(this.svc.aiStats().manual)],
      ['Not Applicable', String(this.svc.aiStats().notApplicable)],
    ]);
    add('Traffic Analytics', ['Metric', 'Value'], [
      ['Total Log Entries', String(this.svc.trafficStats().totalLogs)],
      ['Unique Event Types', String(this.svc.trafficStats().uniqueTypes)],
    ]);
    add('Conversion Analytics', ['Metric', 'Value'], [
      ['Total Listings', String(this.svc.conversionStats().totalListings)],
      ['Published', String(this.svc.conversionStats().published)],
      ['Conversion Rate', this.svc.conversionStats().conversionRate + '%'],
    ]);

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
    rows.push(`<h2>Vrindaya Analytics</h2><p>Generated: ${new Date().toLocaleString()}</p>`);
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
    rows.push(`<h2>Vrindaya Analytics</h2><p>Generated: ${new Date().toLocaleString()}</p>`);
    for (const sec of this.exportData()) {
      rows.push(`<h3>${sec.title}</h3><table><thead><tr>${sec.headers.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>`);
      for (const r of sec.rows) rows.push(`<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`);
      rows.push('</tbody></table>');
    }
    rows.push(`<p style="margin-top:32px;color:#999;font-size:11px">Vrindaya Analytics · ${new Date().toLocaleString()}</p>`);
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
    a.download = `vrindaya-analytics-${new Date().toISOString().slice(0, 10)}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
