import { Component, inject, computed, signal, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink }                          from '@angular/router';
import { CurrencyPipe }                        from '@angular/common';
import { ProductApiService }                   from '../../../../core/services/product-api.service';
import { AdminAuthService }                    from '../../services/admin-auth.service';
import { APP_ROUTES }                          from '../../../../core/constants/routes.constants';
import { timestampMillis }                     from '../../../../shared/utils/timestamp.util';
import { LIFECYCLE_STAGES }                    from '../../../../core/constants/lifecycle-stage.constants';

@Component({
  selector:    'app-admin-dashboard',
  standalone:  true,
  imports:     [RouterLink, CurrencyPipe],
  templateUrl: './admin-dashboard.component.html',
  styleUrl:    './admin-dashboard.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminDashboardComponent {
  readonly productApi = inject(ProductApiService);
  readonly authSvc     = inject(AdminAuthService);
  readonly BASE        = `/${APP_ROUTES.ADMIN}`;

  private readonly notDeleted = computed(() => this.productApi.products().filter(p => !p.deleted));

  readonly totalCount       = computed(() => this.notDeleted().length);
  readonly newArrivalsCount = computed(() => this.notDeleted().filter(p => p.newArrival).length);
  readonly trendingCount    = computed(() => this.notDeleted().filter(p => p.featured).length);
  readonly bestSellersCount = computed(() => this.notDeleted().filter(p => p.bestSeller).length);

  readonly recentProducts = computed(() =>
    [...this.notDeleted()]
      .sort((a, b) => timestampMillis(b.createdAt) - timestampMillis(a.createdAt))
      .slice(0, 5)
  );

  /* ── Inventory & Lifecycle (Phase 7 + 8, consolidated) ── */
  readonly missingFlipkartUrlCount         = computed(() => this.notDeleted().filter(p => !p.flipkartProductUrl).length);
  readonly missingImagesCount              = computed(() => this.notDeleted().filter(p => p.images.length === 0).length);
  readonly missingSeoCount                 = computed(() => this.notDeleted().filter(p => !p.seoTitle || !p.seoDescription).length);
  readonly missingMarketplaceCategoryCount = computed(() => this.notDeleted().filter(p => !p.marketplaceCategory).length);
  readonly lowStockCount                   = computed(() => this.notDeleted().filter(p => p.isLowStock).length);
  readonly outOfStockCount                 = computed(() => this.notDeleted().filter(p => p.isOutOfStock).length);

  /** Products by Lifecycle Stage — all 10 stages, in order, even at zero count. */
  readonly stageBreakdown = computed(() => {
    const products = this.notDeleted();
    return LIFECYCLE_STAGES.map(stage => ({
      stage,
      count: products.filter(p => p.lifecycleStage === stage).length,
    }));
  });

  constructor() {
    this.productApi.ensureLoaded();
  }

  export(): void {
    const blob = new Blob([JSON.stringify(this.productApi.products(), null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement('a'), { href: url, download: 'products.json' });
    a.click();
    URL.revokeObjectURL(url);
  }
}
