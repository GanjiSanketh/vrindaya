import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AnalyticsFirestoreService, ANALYTICS_ROOT, ANALYTICS_PRODUCT_COLLECTION, ANALYTICS_PRODUCT_DAILY_SUB } from './analytics-firestore.service';
import {
  DailyProductAnalytics,
  ProductMetric,
  ProductAnalyticsTotals,
  PRODUCT_METRIC_DAILY_FIELD,
  PRODUCT_METRIC_TOTALS_FIELD,
} from './analytics.models';

const LEGACY_BASE = `${environment.apiBaseUrl}/analytics`;

/**
 * Product Analytics — the dedicated, reusable analytics layer for products.
 *
 * Firestore schema (atomic increments, created on first touch):
 *
 *   analytics/productAnalytics/{productId}
 *     totalDetailClicks, totalFlipkartClicks, totalWishlistClicks,
 *     totalCartClicks, totalPurchases
 *     createdAt, updatedAt, lastClickedAt
 *     daily/{YYYY-MM-DD}
 *       detailClicks, flipkartClicks, wishlistClicks, cartClicks, purchases
 *       createdAt, lastClickedAt
 *
 * Only anonymous visitors and customer users contribute events; Admin /
 * Super Admin sessions are excluded (see AnalyticsFirestoreService).
 * Wishlist / cart / purchase metrics are schema-ready for future features but
 * are not yet emitted from any UI.
 */
@Injectable({ providedIn: 'root' })
export class ProductAnalyticsService {
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly store = inject(AnalyticsFirestoreService);

  /** Products whose totals/daily docs already carry a createdAt seed this session. */
  private readonly seeded = new Set<string>();

  /**
   * @deprecated Legacy scalar counter (`products.websiteClickCount`) used by
   * the admin "Clicks" column — kept for backward compatibility. New analytics
   * should use recordFlipkartClick()/recordDetailClick() instead.
   */
  recordClick(productId: string): void {
    if (!isPlatformBrowser(this.platformId)) return;
    void firstValueFrom(this.http.post<void>(`${LEGACY_BASE}/products/${productId}/click`, {})).catch(() => {});
  }

  /** A product's details were opened (quick view / detail page). */
  recordDetailClick(productId: string): void { this.record(productId, 'detail'); }
  /** A "View/Buy on Flipkart" CTA was clicked. */
  recordFlipkartClick(productId: string): void { this.record(productId, 'flipkart'); }
  /** Prepared — wire when wishlist toggles should be measured. */
  recordWishlistClick(productId: string): void { this.record(productId, 'wishlist'); }
  /** Prepared — wire when cart interactions are measured. */
  recordCartClick(productId: string): void { this.record(productId, 'cart'); }
  /** Prepared — wire when purchases are measured. */
  recordPurchase(productId: string): void { this.record(productId, 'purchase'); }

  private record(productId: string, metric: ProductMetric): void {
    if (!this.store.isEligibleUser()) return;
    const seedCreatedAt = !this.seeded.has(productId);
    if (seedCreatedAt) this.seeded.add(productId);
    void this.commit(productId, metric, seedCreatedAt).catch(() => {});
  }

  private async commit(productId: string, metric: ProductMetric, seedCreatedAt: boolean): Promise<void> {
    const db = await this.store.getFirestore();
    const { totals, daily } = await this.store.productRefs(db, productId, this.store.todayKey());
    await this.store.increment(
      totals,
      daily,
      { [PRODUCT_METRIC_TOTALS_FIELD[metric]]: 1 },
      { [PRODUCT_METRIC_DAILY_FIELD[metric]]: 1 },
      seedCreatedAt,
    );
  }

  // ── Read surface (future Admin Dashboard) ─────────────────────────────

  async getProductTotals(productId: string): Promise<ProductAnalyticsTotals | null> {
    const { doc, getDoc } = await import('firebase/firestore');
    const db = await this.store.getFirestore();
    const snap = await getDoc(doc(db, ANALYTICS_ROOT, ANALYTICS_PRODUCT_COLLECTION, productId));
    return snap.exists() ? (snap.data() as ProductAnalyticsTotals) : null;
  }

  /** Daily docs for a product between `from` and `to` (inclusive, `YYYY-MM-DD`), ascending. */
  async getDailyRange(productId: string, from: string, to: string): Promise<DailyProductAnalytics[]> {
    const { collection, query, where, orderBy, limit, getDocs, documentId } = await import('firebase/firestore');
    const db = await this.store.getFirestore();
    const dailyCol = collection(db, ANALYTICS_ROOT, ANALYTICS_PRODUCT_COLLECTION, productId, ANALYTICS_PRODUCT_DAILY_SUB);
    const snap = await getDocs(
      query(
        dailyCol,
        where(documentId(), '>=', from),
        where(documentId(), '<=', to),
        orderBy(documentId(), 'asc'),
        limit(400),
      ),
    );
    return snap.docs.map(ds => ({ date: ds.id, ...(ds.data() as Omit<DailyProductAnalytics, 'date'>) }));
  }
}
