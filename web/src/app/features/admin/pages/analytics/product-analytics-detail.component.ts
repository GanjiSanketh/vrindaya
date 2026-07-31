import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { AdminAnalyticsService, type ProductAnalyticsDetail } from '../../services/admin-analytics.service';

@Component({
  selector: 'app-product-analytics-detail',
  standalone: true,
  imports: [DecimalPipe],
  template: `
    <div class="pa-page">
      <div class="pa-header">
        <button class="btn btn-outline-secondary btn-sm" (click)="back()">
          <i class="bi bi-arrow-left me-1"></i>Back to Analytics
        </button>
        <div class="pa-title-block">
          <h1 class="pa-title">{{ detail()?.name ?? 'Product Analytics' }}</h1>
          <p class="pa-sub">Per-product click tracking — detail views and Flipkart CTAs.</p>
        </div>
      </div>

      @if (loading()) {
        <div class="d-flex align-items-center gap-2 text-muted py-4">
          <span class="spinner-border spinner-border-sm"></span> Loading product analytics…
        </div>
      } @else if (error()) {
        <div class="alert alert-danger d-flex align-items-center gap-2 py-2" role="alert">
          <i class="bi bi-exclamation-triangle-fill"></i>
          <span>{{ error() }}</span>
        </div>
      } @else if (detail(); as d) {
        <div class="row g-3 mb-4">
          <div class="col-6 col-md-4">
            <div class="card border-0 shadow-sm h-100">
              <div class="card-body d-flex align-items-center gap-3">
                <div class="rounded-3 p-3 flex-shrink-0" style="background:#e3f2fd"><i class="bi bi-eye fs-4 text-primary"></i></div>
                <div class="min-w-0">
                  <h6 class="card-subtitle text-muted mb-1 small">Total Detail Clicks</h6>
                  <span class="fs-4 fw-bold">{{ d.totalDetailClicks | number }}</span>
                </div>
              </div>
            </div>
          </div>
          <div class="col-6 col-md-4">
            <div class="card border-0 shadow-sm h-100">
              <div class="card-body d-flex align-items-center gap-3">
                <div class="rounded-3 p-3 flex-shrink-0" style="background:#fff3e0"><i class="bi bi-cart fs-4 text-warning"></i></div>
                <div class="min-w-0">
                  <h6 class="card-subtitle text-muted mb-1 small">Total Flipkart Clicks</h6>
                  <span class="fs-4 fw-bold">{{ d.totalFlipkartClicks | number }}</span>
                </div>
              </div>
            </div>
          </div>
          <div class="col-6 col-md-4">
            <div class="card border-0 shadow-sm h-100">
              <div class="card-body d-flex align-items-center gap-3">
                <div class="rounded-3 p-3 flex-shrink-0" style="background:#e8f5e9"><i class="bi bi-clock-history fs-4 text-success"></i></div>
                <div class="min-w-0">
                  <h6 class="card-subtitle text-muted mb-1 small">Last Clicked</h6>
                  <span class="fs-6 fw-bold text-break">{{ formatDate(d.lastClickedAt) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="card border-0 shadow-sm mb-4">
          <div class="card-header bg-transparent border-bottom-0 pt-3 pb-0">
            <h6 class="fs-6 fw-semibold mb-0">Product</h6>
          </div>
          <div class="card-body d-flex align-items-center gap-3">
            @if (d.image) {
              <img class="pa-thumb" [src]="d.image" alt="" loading="lazy" />
            } @else {
              <span class="pa-thumb pa-thumb-empty"><i class="bi bi-box-seam"></i></span>
            }
            <div>
              <div class="fw-semibold">{{ d.name }}</div>
              <div class="text-muted small text-break">{{ d.id }}</div>
            </div>
          </div>
        </div>

        <div class="card border-0 shadow-sm">
          <div class="card-header bg-transparent border-bottom-0 pt-3 pb-0">
            <h6 class="fs-6 fw-semibold mb-0">Daily Breakdown</h6>
          </div>
          <div class="card-body p-0">
            <div class="table-responsive">
              <table class="table table-sm table-hover mb-0">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th class="text-end">Detail Clicks</th>
                    <th class="text-end">Flipkart Clicks</th>
                    <th class="text-end">Last Clicked</th>
                  </tr>
                </thead>
                <tbody>
                  @for (day of d.daily; track day.date) {
                    <tr>
                      <td class="fw-semibold">{{ day.date }}</td>
                      <td class="text-end">{{ day.detailClicks | number }}</td>
                      <td class="text-end">{{ day.flipkartClicks | number }}</td>
                      <td class="text-end text-muted small">{{ formatDate(day.lastClickedAt) }}</td>
                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="4" class="text-center text-muted py-4">No daily activity recorded.</td>
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
  styles: [
    `
    .pa-page { display: flex; flex-direction: column; gap: 1.5rem; }
    .pa-header { display: flex; flex-direction: column; gap: 0.75rem; }
    .pa-title-block { order: -1; }
    .pa-title { font-family: 'Cormorant Garamond', serif; font-size: 1.75rem; font-weight: 700; color: #1a1a2e; margin: 0 0 0.25rem; }
    .pa-sub { color: #6b7280; font-size: 0.875rem; margin: 0; }
    .pa-thumb {
      width: 56px; height: 56px; object-fit: cover; border-radius: 8px; flex-shrink: 0;
      background: #f3f4f6; display: inline-flex; align-items: center; justify-content: center;
    }
    .pa-thumb-empty { color: #9ca3af; font-size: 1.25rem; }
    .card { border-radius: 10px; overflow: hidden; }
    .card-header h6 { font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.03em; color: #374151; }
    .table-responsive { overflow-x: auto; }
    .table th { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.04em; color: #6b7280; border-top: none; padding: 0.5rem 0.75rem; }
    .table td { padding: 0.4rem 0.75rem; font-size: 0.85rem; vertical-align: middle; }

    @media (min-width: 768px) {
      .pa-header { flex-direction: row; align-items: flex-start; justify-content: space-between; }
      .pa-title-block { order: 0; }
    }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductAnalyticsDetailComponent {
  private readonly route = inject(ActivatedRoute);
  readonly svc = inject(AdminAnalyticsService);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly detail = signal<ProductAnalyticsDetail | null>(null);

  constructor() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      void this.refresh(id);
    } else {
      this.loading.set(false);
      this.error.set('Missing product id.');
    }
  }

  async refresh(id: string): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      this.detail.set(await this.svc.getProductAnalytics(id));
    } catch {
      this.error.set('Failed to load product analytics.');
    } finally {
      this.loading.set(false);
    }
  }

  back(): void {
    window.location.href = '/admin/analytics';
  }

  formatDate(value: string | null): string {
    if (!value) return '—';
    return new Date(value).toLocaleString();
  }
}
