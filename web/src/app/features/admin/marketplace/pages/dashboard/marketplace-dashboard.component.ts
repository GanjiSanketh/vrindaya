import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MarketplaceLayoutComponent } from '../../layouts/marketplace-layout.component';
import { ChartComponent } from '../../../../../shared/components/chart/chart.component';
import { MarketplaceDashboardService } from '../../services/marketplace-dashboard.service';

@Component({
  selector: 'app-marketplace-dashboard',
  standalone: true,
  imports: [MarketplaceLayoutComponent, ChartComponent, RouterLink, DatePipe],
  template: `
    <app-marketplace-layout title="Marketplace Dashboard" subtitle="Live overview of your marketplace activity and performance.">
      @if (dash.loading()) {
        <div class="d-flex align-items-center gap-2 text-muted py-4">
          <span class="spinner-border spinner-border-sm"></span> Loading dashboard…
        </div>
      }

      <div class="row g-3 mb-4">
        <div class="col-6 col-md-4 col-xl">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-body d-flex align-items-center gap-3">
              <div class="bg-primary bg-opacity-10 rounded-3 p-3 flex-shrink-0">
                <i class="bi bi-card-list fs-4 text-primary"></i>
              </div>
              <div class="min-w-0">
                <h6 class="card-subtitle text-muted mb-1 small">Total Listings</h6>
                <span class="fs-4 fw-bold">{{ dash.stats().totalListings }}</span>
              </div>
            </div>
          </div>
        </div>
        <div class="col-6 col-md-4 col-xl">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-body d-flex align-items-center gap-3">
              <div class="bg-success bg-opacity-10 rounded-3 p-3 flex-shrink-0">
                <i class="bi bi-check-circle fs-4 text-success"></i>
              </div>
              <div class="min-w-0">
                <h6 class="card-subtitle text-muted mb-1 small">Published</h6>
                <span class="fs-4 fw-bold">{{ dash.stats().published }}</span>
              </div>
            </div>
          </div>
        </div>
        <div class="col-6 col-md-4 col-xl">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-body d-flex align-items-center gap-3">
              <div class="bg-secondary bg-opacity-10 rounded-3 p-3 flex-shrink-0">
                <i class="bi bi-pencil fs-4 text-secondary"></i>
              </div>
              <div class="min-w-0">
                <h6 class="card-subtitle text-muted mb-1 small">Draft</h6>
                <span class="fs-4 fw-bold">{{ dash.stats().draft }}</span>
              </div>
            </div>
          </div>
        </div>
        <div class="col-6 col-md-4 col-xl">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-body d-flex align-items-center gap-3">
              <div class="bg-warning bg-opacity-10 rounded-3 p-3 flex-shrink-0">
                <i class="bi bi-clock fs-4 text-warning"></i>
              </div>
              <div class="min-w-0">
                <h6 class="card-subtitle text-muted mb-1 small">Pending</h6>
                <span class="fs-4 fw-bold">{{ dash.stats().pending }}</span>
              </div>
            </div>
          </div>
        </div>
        <div class="col-6 col-md-4 col-xl">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-body d-flex align-items-center gap-3">
              <div class="bg-danger bg-opacity-10 rounded-3 p-3 flex-shrink-0">
                <i class="bi bi-x-circle fs-4 text-danger"></i>
              </div>
              <div class="min-w-0">
                <h6 class="card-subtitle text-muted mb-1 small">Failed</h6>
                <span class="fs-4 fw-bold">{{ dash.stats().failed }}</span>
              </div>
            </div>
          </div>
        </div>
        <div class="col-6 col-md-4 col-xl">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-body d-flex align-items-center gap-3">
              <div class="bg-dark bg-opacity-10 rounded-3 p-3 flex-shrink-0">
                <i class="bi bi-box fs-4 text-dark"></i>
              </div>
              <div class="min-w-0">
                <h6 class="card-subtitle text-muted mb-1 small">Out of Stock</h6>
                <span class="fs-4 fw-bold">{{ dash.stats().outOfStock }}</span>
              </div>
            </div>
          </div>
        </div>
        <div class="col-6 col-md-4 col-xl">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-body d-flex align-items-center gap-3">
              <div class="bg-purple bg-opacity-10 rounded-3 p-3 flex-shrink-0" style="background:#f3e8ff!important">
                <i class="bi bi-exclamation-diamond fs-4" style="color:#9333ea"></i>
              </div>
              <div class="min-w-0">
                <h6 class="card-subtitle text-muted mb-1 small">Needs Review</h6>
                <span class="fs-4 fw-bold">{{ dash.stats().needsReview }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="row g-3 mb-4">
        <div class="col-12 col-md-4">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-header bg-transparent border-bottom-0 pt-3 pb-0">
              <h6 class="card-title fs-6 fw-semibold mb-0">Marketplace Distribution</h6>
            </div>
            <div class="card-body">
              <app-chart
                [type]="'doughnut'"
                [labels]="dash.platformDistribution().labels"
                [data]="dash.platformDistribution().data"
                [datasetLabel]="'Listings'"
              />
            </div>
          </div>
        </div>
        <div class="col-12 col-md-4">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-header bg-transparent border-bottom-0 pt-3 pb-0">
              <h6 class="card-title fs-6 fw-semibold mb-0">Publish Trend (7 days)</h6>
            </div>
            <div class="card-body">
              <app-chart
                [type]="'bar'"
                [labels]="dash.publishTrend().labels"
                [data]="dash.publishTrend().data"
                [datasetLabel]="'Published'"
                [color]="'#10b981'"
              />
            </div>
          </div>
        </div>
        <div class="col-12 col-md-4">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-header bg-transparent border-bottom-0 pt-3 pb-0">
              <h6 class="card-title fs-6 fw-semibold mb-0">Sync Trend (7 days)</h6>
            </div>
            <div class="card-body">
              <app-chart
                [type]="'line'"
                [labels]="dash.syncTrend().labels"
                [data]="dash.syncTrend().data"
                [datasetLabel]="'Syncs'"
                [color]="'#0f6f84'"
              />
            </div>
          </div>
        </div>
      </div>

      <div class="row g-3 mb-4">
        <div class="col-12 col-md-4">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-header bg-transparent border-bottom-0 pt-3 pb-0">
              <h6 class="card-title fs-6 fw-semibold mb-0">Category Distribution</h6>
            </div>
            <div class="card-body">
              <app-chart
                [type]="'doughnut'"
                [labels]="dash.categoryDistribution().labels"
                [data]="dash.categoryDistribution().data"
                [datasetLabel]="'Products'"
              />
            </div>
          </div>
        </div>
        <div class="col-12 col-md-4">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-header bg-transparent border-bottom-0 pt-3 pb-0">
              <h6 class="card-title fs-6 fw-semibold mb-0">AI Usage</h6>
            </div>
            <div class="card-body">
              <app-chart
                [type]="'doughnut'"
                [labels]="dash.aiUsage().labels"
                [data]="dash.aiUsage().data"
                [datasetLabel]="'Listings'"
              />
            </div>
          </div>
        </div>
        <div class="col-12 col-md-4">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-header bg-transparent border-bottom-0 pt-3 pb-0">
              <h6 class="card-title fs-6 fw-semibold mb-0">Listing Growth (30 days)</h6>
            </div>
            <div class="card-body">
              <app-chart
                [type]="'line'"
                [labels]="dash.listingGrowth().labels"
                [data]="dash.listingGrowth().data"
                [datasetLabel]="'New Listings'"
                [color]="'#2563eb'"
              />
            </div>
          </div>
        </div>
      </div>

      <div class="row g-3">
        <div class="col-12 col-lg-8">
          <div class="card border-0 shadow-sm">
            <div class="card-header bg-transparent border-bottom-0 pt-3 pb-0 d-flex justify-content-between align-items-center">
              <h6 class="card-title fs-6 fw-semibold mb-0">Recent Activity</h6>
              <a class="small text-decoration-none" routerLink="/admin/marketplace/sync-centre">View All</a>
            </div>
            <div class="card-body p-0">
              @if (dash.recentActivity().length === 0) {
                <p class="text-muted small p-3 mb-0">No activity yet.</p>
              } @else {
                <div class="list-group list-group-flush">
                  @for (item of dash.recentActivity(); track item.id) {
                    <div class="list-group-item list-group-item-action d-flex align-items-center gap-3 px-3 py-2">
                      <span class="badge rounded-pill flex-shrink-0" [class]="badgeClass(item.type)">{{ item.type }}</span>
                      <span class="small flex-grow-1 text-truncate">{{ item.message }}</span>
                      <small class="text-muted flex-shrink-0">{{ item.time | date:'short' }}</small>
                    </div>
                  }
                </div>
              }
            </div>
          </div>
        </div>
        <div class="col-12 col-lg-4">
          <div class="card border-0 shadow-sm">
            <div class="card-header bg-transparent border-bottom-0 pt-3 pb-0">
              <h6 class="card-title fs-6 fw-semibold mb-0">Quick Actions</h6>
            </div>
            <div class="card-body">
              <div class="d-grid gap-2">
                <a class="btn btn-outline-primary btn-sm text-start" routerLink="/admin/marketplace/products">
                  <i class="bi bi-plus-circle me-2"></i>Add Products
                </a>
                <a class="btn btn-outline-primary btn-sm text-start" routerLink="/admin/marketplace/listings">
                  <i class="bi bi-card-list me-2"></i>Manage Listings
                </a>
                <a class="btn btn-outline-primary btn-sm text-start" routerLink="/admin/marketplace/sync-centre">
                  <i class="bi bi-arrow-repeat me-2"></i>Sync Now
                </a>
                <a class="btn btn-outline-primary btn-sm text-start" routerLink="/admin/marketplace/settings">
                  <i class="bi bi-gear me-2"></i>Configure Settings
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </app-marketplace-layout>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MarketplaceDashboardComponent {
  readonly dash = inject(MarketplaceDashboardService);

  badgeClass(type: string): string {
    const map: Record<string, string> = {
      info: 'bg-info text-dark', success: 'bg-success', warning: 'bg-warning text-dark',
      error: 'bg-danger', sync: 'bg-primary', create: 'bg-success',
      update: 'bg-info text-dark', delete: 'bg-danger', publish: 'bg-success', unpublish: 'bg-warning text-dark',
    };
    return map[type] ?? 'bg-secondary';
  }
}
