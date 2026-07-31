import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';

/** Aggregate dashboard summary — all-time + today's counters and tracked-product count. */
export interface AnalyticsOverview {
  totalDetailClicks: number;
  totalFlipkartClicks: number;
  todayDetailClicks: number;
  todayFlipkartClicks: number;
  totalProductsTracked: number;
}

/** One row of the Top Viewed / Top Flipkart tables. */
export interface TopProductAnalytics {
  id: string;
  name: string;
  image: string | null;
  detailClicks: number;
  flipkartClicks: number;
  lastClickedAt: string | null;
}

/** One `YYYY-MM-DD` row of a product's daily analytics. */
export interface DailyProductAnalytics {
  date: string;
  detailClicks: number;
  flipkartClicks: number;
  lastClickedAt: string | null;
}

/** Full per-product analytics — totals plus the daily breakdown (newest first). */
export interface ProductAnalyticsDetail {
  id: string;
  name: string;
  image: string | null;
  totalDetailClicks: number;
  totalFlipkartClicks: number;
  lastClickedAt: string | null;
  daily: DailyProductAnalytics[];
}

export type TopAnalyticsSort = 'detail' | 'flipkart';

const URL = `${environment.apiBaseUrl}/analytics`;

/**
 * Read-only client for the Admin Analytics dashboard. Auth is attached by the
 * app-wide authTokenInterceptor (AppJwt Bearer header) — the same trust path
 * every other admin HTTP call uses. Endpoints are admin-only server-side via
 * the fallback AdminOnly policy.
 */
@Injectable({ providedIn: 'root' })
export class AdminAnalyticsService {
  private readonly http = inject(HttpClient);

  getOverview(): Promise<AnalyticsOverview> {
    return firstValueFrom(this.http.get<AnalyticsOverview>(`${URL}/overview`));
  }

  getTopProducts(sort: TopAnalyticsSort = 'detail', limit = 10): Promise<TopProductAnalytics[]> {
    return firstValueFrom(
      this.http.get<TopProductAnalytics[]>(`${URL}/top`, { params: { sort, limit: String(limit) } }),
    );
  }

  getProductAnalytics(id: string): Promise<ProductAnalyticsDetail> {
    return firstValueFrom(this.http.get<ProductAnalyticsDetail>(`${URL}/products/${id}`));
  }
}
