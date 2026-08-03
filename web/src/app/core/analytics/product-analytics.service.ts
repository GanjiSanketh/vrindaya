import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AnalyticsFirestoreService, ANALYTICS_ROOT, ANALYTICS_PRODUCT_DAILY_SUB } from './analytics-firestore.service';
import { AnalyticsSettingsService } from './analytics-settings.service';
import type { AnalyticsSettings } from './analytics-settings.model';
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
 *   analytics/{productId}
 *     totalDetailClicks, totalFlipkartClicks, totalWishlistClicks,
 *     totalCartClicks, totalPurchases
 *     createdAt, updatedAt, lastClickedAt
 *     daily/{YYYY-MM-DD}
 *       detailClicks, flipkartClicks, wishlistClicks, cartClicks, purchases
 *       createdAt, lastClickedAt
 *
 * Document paths must carry an even number of segments (collection/doc
 * alternating), so the totals doc lives directly at `analytics/{productId}`
 * and the daily doc at `analytics/{productId}/daily/{YYYY-MM-DD}`.
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
  private readonly settingsSvc = inject(AnalyticsSettingsService);

  /** Products whose totals/daily docs already carry a createdAt seed this session. */
  private readonly seeded = new Set<string>();

  /**
   * @deprecated Legacy scalar counter (`products.websiteClickCount`) used by
   * the admin "Clicks" column — kept for backward compatibility. New analytics
   * should use recordFlipkartClick()/recordDetailClick() instead.
   */
  recordClick(productId: string): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const settings = this.settingsSvc.settings();
    // TEMP DIAG — remove after verification.
    // eslint-disable-next-line no-console
    console.log('Tracking Settings:', settings);
    if (!settings.trackingEnabled) {
      // eslint-disable-next-line no-console
      console.log('[Analytics GATE] Skipping legacy click — WebsiteTracking OFF');
      return;
    }
    if (!settings.productClicks) {
      // eslint-disable-next-line no-console
      console.log('[Analytics GATE] Skipping legacy click — ProductClickTracking OFF');
      return;
    }
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

  /**
   * TEMP DIAG — the settings gate at the exact point the counter would be
   * incremented. This is the final client-side enforcement boundary: even if a
   * caller bypasses {@link AnalyticsService}'s gate, the Firestore write is
   * refused here. `trackingEnabled` is the global kill-switch; per-metric
   * switches gate their own events (wishlist → wishlistTracking, everything
   * else → productClicks), matching the storefront facade.
   */
  private trackingAllowed(productId: string, metric: ProductMetric): boolean {
    const settings: AnalyticsSettings = this.settingsSvc.settings();
    // TEMP DIAG — remove after verification.
    // eslint-disable-next-line no-console
    console.log('Tracking Settings:', settings);
    if (!settings.trackingEnabled) {
      // eslint-disable-next-line no-console
      console.log(`[Analytics GATE] Skipping analytics event — WebsiteTracking OFF (${productId}/${metric})`);
      return false;
    }
    const switchField = metric === 'wishlist' ? 'wishlistTracking' : 'productClicks';
    if (!settings[switchField]) {
      // eslint-disable-next-line no-console
      console.log(`[Analytics GATE] Skipping analytics event — ${switchField} OFF (${productId}/${metric})`);
      return false;
    }
    // eslint-disable-next-line no-console
    console.log(`[Analytics GATE] Tracking ${metric} click (${productId})`);
    return true;
  }

  private record(productId: string, metric: ProductMetric): void {
    this.diag('Entering record() — click event', { productId, metric });
    if (!this.trackingAllowed(productId, metric)) return;
    if (!this.store.isEligibleUser()) {
      this.diag('Analytics SKIPPED — role not eligible (Admin/SuperAdmin/SSR)', { productId, metric });
      return;
    }
    const seedCreatedAt = !this.seeded.has(productId);
    if (seedCreatedAt) this.seeded.add(productId);
    void this.commit(productId, metric, seedCreatedAt).catch(err => {
      console.error('[Analytics DIAG] commit() rejected — full exception:', err);
    });
  }

  /** TEMP DIAG — structured console logging for the analytics write path. Remove after verification. */
  private diag(message: string, data: Record<string, unknown> = {}): void {
    // eslint-disable-next-line no-console
    console.log('[Analytics DIAG]', message, JSON.stringify(data));
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
    const snap = await getDoc(doc(db, ANALYTICS_ROOT, productId));
    return snap.exists() ? (snap.data() as ProductAnalyticsTotals) : null;
  }

  /** Daily docs for a product between `from` and `to` (inclusive, `YYYY-MM-DD`), ascending. */
  async getDailyRange(productId: string, from: string, to: string): Promise<DailyProductAnalytics[]> {
    const { collection, query, where, orderBy, limit, getDocs, documentId } = await import('firebase/firestore');
    const db = await this.store.getFirestore();
    const dailyCol = collection(db, ANALYTICS_ROOT, productId, ANALYTICS_PRODUCT_DAILY_SUB);
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
