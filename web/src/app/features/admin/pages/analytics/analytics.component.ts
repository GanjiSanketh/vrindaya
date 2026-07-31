import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { AdminAnalyticsService, type AnalyticsOverview, type TopProductAnalytics } from '../../services/admin-analytics.service';

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [DecimalPipe],
  template: `
    <div class="an-page">
      <div class="an-header">
        <div>
          <h1 class="an-title">Analytics</h1>
          <p class="an-sub">Product analytics — detail and Flipkart click tracking across the storefront.</p>
        </div>
        <div class="an-actions">
          <button class="btn btn-outline-secondary btn-sm" (click)="refresh()" [disabled]="loading()">
            <i class="bi bi-arrow-clockwise me-1"></i>Refresh
          </button>
        </div>
      </div>

      @if (loading()) {
        <div class="d-flex align-items-center gap-2 text-muted py-4">
          <span class="spinner-border spinner-border-sm"></span> Loading analytics…
        </div>
      } @else if (error()) {
        <div class="alert alert-danger d-flex align-items-center gap-2 py-2" role="alert">
          <i class="bi bi-exclamation-triangle-fill"></i>
          <span>{{ error() }}</span>
        </div>
      } @else {
        <div class="row g-3 mb-4">
          <div class="col-6 col-md-3">
            <div class="card border-0 shadow-sm h-100">
              <div class="card-body d-flex align-items-center gap-3">
                <div class="rounded-3 p-3 flex-shrink-0" style="background:#e3f2fd"><i class="bi bi-eye fs-4 text-primary"></i></div>
                <div class="min-w-0">
                  <h6 class="card-subtitle text-muted mb-1 small">Total Detail Clicks</h6>
                  <span class="fs-4 fw-bold">{{ (overview()?.totalDetailClicks ?? 0) | number }}</span>
                </div>
              </div>
            </div>
          </div>
          <div class="col-6 col-md-3">
            <div class="card border-0 shadow-sm h-100">
              <div class="card-body d-flex align-items-center gap-3">
                <div class="rounded-3 p-3 flex-shrink-0" style="background:#fff3e0"><i class="bi bi-cart fs-4 text-warning"></i></div>
                <div class="min-w-0">
                  <h6 class="card-subtitle text-muted mb-1 small">Total Flipkart Clicks</h6>
                  <span class="fs-4 fw-bold">{{ (overview()?.totalFlipkartClicks ?? 0) | number }}</span>
                </div>
              </div>
            </div>
          </div>
          <div class="col-6 col-md-3">
            <div class="card border-0 shadow-sm h-100">
              <div class="card-body d-flex align-items-center gap-3">
                <div class="rounded-3 p-3 flex-shrink-0" style="background:#e8f5e9"><i class="bi bi-graph-up-arrow fs-4 text-success"></i></div>
                <div class="min-w-0">
                  <h6 class="card-subtitle text-muted mb-1 small">Today's Product Clicks</h6>
                  <span class="fs-4 fw-bold">{{ (overview()?.todayDetailClicks ?? 0) | number }}</span>
                </div>
              </div>
            </div>
          </div>
          <div class="col-6 col-md-3">
            <div class="card border-0 shadow-sm h-100">
              <div class="card-body d-flex align-items-center gap-3">
                <div class="rounded-3 p-3 flex-shrink-0" style="background:#fce4ec"><i class="bi bi-cart-check fs-4 text-danger"></i></div>
                <div class="min-w-0">
                  <h6 class="card-subtitle text-muted mb-1 small">Today's Flipkart Clicks</h6>
                  <span class="fs-4 fw-bold">{{ (overview()?.todayFlipkartClicks ?? 0) | number }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="card border-0 shadow-sm mb-4">
          <div class="card-header bg-transparent border-bottom-0 pt-3 pb-0">
            <h6 class="fs-6 fw-semibold mb-0">Top Viewed Products</h6>
          </div>
          <div class="card-body p-0">
            <div class="table-responsive">
              <table class="table table-sm table-hover mb-0">
                <thead>
                  <tr>
                    <th style="width:64px">Image</th>
                    <th>Product Name</th>
                    <th class="text-end">Detail Clicks</th>
                    <th class="text-end">Flipkart Clicks</th>
                    <th class="text-end">Last Clicked</th>
                  </tr>
                </thead>
                <tbody>
                  @for (p of topViewed(); track p.id) {
                    <tr>
                      <td>
                        @if (p.image) {
                          <img class="an-thumb" [src]="p.image" alt="" loading="lazy" />
                        } @else {
                          <span class="an-thumb an-thumb-empty"><i class="bi bi-box-seam"></i></span>
                        }
                      </td>
                      <td><a class="an-link" (click)="openProduct(p.id)">{{ p.name }}</a></td>
                      <td class="text-end fw-semibold">{{ p.detailClicks | number }}</td>
                      <td class="text-end">{{ p.flipkartClicks | number }}</td>
                      <td class="text-end text-muted small">{{ formatDate(p.lastClickedAt) }}</td>
                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="5" class="text-center text-muted py-4">No tracked products yet.</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div class="card border-0 shadow-sm">
          <div class="card-header bg-transparent border-bottom-0 pt-3 pb-0">
            <h6 class="fs-6 fw-semibold mb-0">Top Flipkart Products</h6>
          </div>
          <div class="card-body p-0">
            <div class="table-responsive">
              <table class="table table-sm table-hover mb-0">
                <thead>
                  <tr>
                    <th style="width:64px">Image</th>
                    <th>Product Name</th>
                    <th class="text-end">Flipkart Clicks</th>
                    <th class="text-end">Detail Clicks</th>
                  </tr>
                </thead>
                <tbody>
                  @for (p of topFlipkart(); track p.id) {
                    <tr>
                      <td>
                        @if (p.image) {
                          <img class="an-thumb" [src]="p.image" alt="" loading="lazy" />
                        } @else {
                          <span class="an-thumb an-thumb-empty"><i class="bi bi-box-seam"></i></span>
                        }
                      </td>
                      <td><a class="an-link" (click)="openProduct(p.id)">{{ p.name }}</a></td>
                      <td class="text-end fw-semibold">{{ p.flipkartClicks | number }}</td>
                      <td class="text-end">{{ p.detailClicks | number }}</td>
                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="4" class="text-center text-muted py-4">No tracked products yet.</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styleUrl: './analytics.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnalyticsComponent {
  readonly svc = inject(AdminAnalyticsService);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly overview = signal<AnalyticsOverview | null>(null);
  readonly topViewed = signal<TopProductAnalytics[]>([]);
  readonly topFlipkart = signal<TopProductAnalytics[]>([]);

  constructor() {
    this.refresh();
  }

  async refresh(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const [overview, topViewed, topFlipkart] = await Promise.all([
        this.svc.getOverview(),
        this.svc.getTopProducts('detail', 10),
        this.svc.getTopProducts('flipkart', 10),
      ]);
      this.overview.set(overview);
      this.topViewed.set(topViewed);
      this.topFlipkart.set(topFlipkart);
    } catch {
      this.error.set('Failed to load analytics. Check the API is reachable and you are signed in as an admin.');
    } finally {
      this.loading.set(false);
    }
  }

  openProduct(id: string): void {
    window.location.href = `/admin/analytics/product/${id}`;
  }

  formatDate(value: string | null): string {
    if (!value) return '—';
    return new Date(value).toLocaleString();
  }
}
