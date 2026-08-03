import { Injectable, inject, PLATFORM_ID, effect, DestroyRef } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AnalyticsSettings } from './analytics-settings.model';
import { AnalyticsSettingsService } from './analytics-settings.service';
import {
  AnalyticsFirestoreService,
  SITE_ANALYTICS_ROOT,
  SITE_ANALYTICS_TOTALS_ID,
  SITE_ANALYTICS_DAILY_SUB,
  SITE_ANALYTICS_SEARCHES_SUB,
  SITE_ANALYTICS_PERFORMANCE_SUB,
} from './analytics-firestore.service';
import { ProductAnalyticsService } from './product-analytics.service';

/** Counter fields on the `siteAnalytics` totals / daily documents. */
export type SiteAnalyticsMetric =
  | 'heroClicks'
  | 'categoryClicks'
  | 'collectionClicks'
  | 'navClicks'
  | 'footerClicks'
  | 'searchClicks'
  | 'pageViews'
  | 'scrollEvents'
  | 'checkoutStarts'
  | 'orderSuccesses';

const SCROLL_THROTTLE_MS = 1_000;
const SEARCH_KEY_MAX = 60;

/**
 * The single analytics façade for the storefront.
 *
 * Every public `trackXxx()` method:
 *  1. reads the CACHED settings (never Firestore),
 *  2. returns immediately if `trackingEnabled` is false or the event's own
 *     switch is off,
 *  3. otherwise records the event (product events delegate to
 *     ProductAnalyticsService; site events increment the `siteAnalytics`
 *     counters).
 *
 * Adding a new event is one method of ~3 lines. Settings are kept live by
 * {@link AnalyticsSettingsService} via a realtime Firestore subscription —
 * repeated clicks never trigger Firestore reads, and an admin save in any tab
 * takes effect immediately. The cache is fail-closed ({@link SAFE_OFF_SETTINGS}
 * until a snapshot proves otherwise), and the database itself enforces the
 * switches server-side (see firestore.rules + the API's analytics write gate),
 * so a stale or compromised client cannot record events when tracking is off.
 */
@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly settingsSvc = inject(AnalyticsSettingsService);
  private readonly store = inject(AnalyticsFirestoreService);
  private readonly productAnalytics = inject(ProductAnalyticsService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  private readonly siteSeeded = new Set<string>();
  private scrollAttached = false;
  private perfCaptured = false;

  constructor() {
    // Client-side page views — fires once per completed navigation.
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(() => this.trackPageView());

    if (isPlatformBrowser(this.platformId)) {
      // Attach the scroll / performance captures ONLY when their switches are
      // on (both default OFF), so a default site never pays for a listener.
      effect(() => {
        const s = this.settingsSvc.settings();
        if (s.trackingEnabled && s.scrollTracking) this.attachScrollTracking();
        if (s.trackingEnabled && s.performanceTracking) this.capturePerformance();
      });
    }
  }

  /**
   * Kicks off the one-time settings read. Safe to call repeatedly — only the
   * first call touches Firestore.
   */
  ensureLoaded(): Promise<AnalyticsSettings> {
    return this.settingsSvc.ensureLoaded();
  }

  // ── Product-domain events (delegate to ProductAnalyticsService) ──────────

  /** A product card was clicked (opens the product / Flipkart listing). */
  trackProductClick(productId: string): void {
    if (!this.isEnabled('productClicks')) return;
    this.productAnalytics.recordFlipkartClick(productId);
  }

  /** The quick-view modal was opened for a product. */
  trackQuickView(productId: string): void {
    if (!this.isEnabled('productClicks')) return;
    this.productAnalytics.recordDetailClick(productId);
  }

  /** A product's detail page was viewed. */
  trackProductView(productId: string): void {
    if (!this.isEnabled('productClicks')) return;
    this.productAnalytics.recordDetailClick(productId);
  }

  /** An explicit "View / Buy on Flipkart" CTA was clicked. */
  trackFlipkartClick(productId: string): void {
    if (!this.isEnabled('productClicks')) return;
    this.productAnalytics.recordFlipkartClick(productId);
  }

  /** Legacy scalar "Clicks" counter (products.websiteClickCount) — gated like every other event. */
  trackLegacyClick(productId: string): void {
    if (!this.isEnabled('productClicks')) return;
    this.productAnalytics.recordClick(productId);
  }

  /** A wishlist toggle happened (add or remove). */
  trackWishlist(productId: string): void {
    if (!this.isEnabled('wishlistTracking')) return;
    this.productAnalytics.recordWishlistClick(productId);
  }

  /** An item was added to the cart. */
  trackAddToCart(productId: string): void {
    if (!this.isEnabled('productClicks')) return;
    this.productAnalytics.recordCartClick(productId);
  }

  /** Checkout was started. */
  trackCheckoutStart(): void {
    if (!this.isEnabled('productClicks')) return;
    this.recordSiteEvent('checkoutStarts');
  }

  /** An order was successfully placed. */
  trackOrderSuccess(productIds: string[] = []): void {
    if (!this.isEnabled('productClicks')) return;
    for (const id of productIds) this.productAnalytics.recordPurchase(id);
    this.recordSiteEvent('orderSuccesses');
  }

  // ── Site-wide events (siteAnalytics counters) ────────────────────────────

  /** A hero banner / showcase CTA was clicked. */
  trackHeroClick(_label?: string): void {
    if (!this.isEnabled('heroClicks')) return;
    this.recordSiteEvent('heroClicks');
  }

  /** A category card or filter was clicked. */
  trackCategoryClick(_categoryId: string): void {
    if (!this.isEnabled('categoryClicks')) return;
    this.recordSiteEvent('categoryClicks');
  }

  /** A collection link (New Arrivals, Trending, Shop…) was clicked. */
  trackCollectionClick(_collectionId?: string): void {
    if (!this.isEnabled('collectionClicks')) return;
    this.recordSiteEvent('collectionClicks');
  }

  /** A main-navigation menu link was clicked. No dedicated switch — gated by global tracking only. */
  trackNavClick(_label: string): void {
    if (!this.settingsSvc.settings().trackingEnabled) return;
    this.recordSiteEvent('navClicks');
  }

  /** A footer link was clicked. No dedicated switch — gated by global tracking only. */
  trackFooterLinkClick(_label: string): void {
    if (!this.settingsSvc.settings().trackingEnabled) return;
    this.recordSiteEvent('footerClicks');
  }

  /** A search was performed with a non-empty query. */
  trackSearch(query: string): void {
    if (!this.isEnabled('searchTracking')) return;
    const trimmed = (query ?? '').trim();
    if (!trimmed) return;
    if (!this.store.isEligibleUser()) return;
    void this.commitSearch(trimmed).catch(() => {});
  }

  /** A search result (or "view all") was clicked. */
  trackSearchResultClick(_query?: string): void {
    if (!this.isEnabled('searchTracking')) return;
    this.recordSiteEvent('searchClicks');
  }

  /** A route navigation completed. */
  trackPageView(): void {
    if (!this.isEnabled('pageViews')) return;
    this.recordSiteEvent('pageViews');
  }

  /** A scroll event fired (only when scrollTracking is enabled). */
  trackScroll(): void {
    if (!this.isEnabled('scrollTracking')) return;
    this.recordSiteEvent('scrollEvents');
  }

  /** Captures navigation-timing performance metrics (only when performanceTracking is enabled). */
  trackPerformance(): void {
    if (!this.isEnabled('performanceTracking')) return;
    if (!isPlatformBrowser(this.platformId) || typeof performance === 'undefined') return;
    if (!this.store.isEligibleUser()) return;
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    void this.commitPerformance(nav).catch(() => {});
  }

  // ── Internals ────────────────────────────────────────────────────────────

  private isEnabled(field: keyof AnalyticsSettings): boolean {
    const s = this.settingsSvc.settings();
    const allowed = s.trackingEnabled && s[field] === true;
    // TEMP DIAG — remove after verification. Logs the exact settings this
    // event was gated on and the decision (RECORD vs SKIP).
    // eslint-disable-next-line no-console
    console.log(
      `[Analytics GATE] event=${String(field)} trackingEnabled=${s.trackingEnabled} ` +
        `${String(field)}=${s[field]} → ${allowed ? 'RECORD' : 'SKIP'}`,
    );
    return allowed;
  }

  private recordSiteEvent(field: SiteAnalyticsMetric, by = 1): void {
    if (!this.store.isEligibleUser()) return;
    const seed = !this.siteSeeded.has('site');
    if (seed) this.siteSeeded.add('site');
    void this.commitSite(field, by, seed).catch(() => {});
  }

  private async commitSite(field: SiteAnalyticsMetric, by: number, seedCreatedAt: boolean): Promise<void> {
    const db = await this.store.getFirestore();
    const { doc } = await import('firebase/firestore');
    const totals = doc(db, SITE_ANALYTICS_ROOT, SITE_ANALYTICS_TOTALS_ID);
    const daily = doc(db, SITE_ANALYTICS_ROOT, SITE_ANALYTICS_DAILY_SUB, this.store.todayKey());
    await this.store.increment(
      totals,
      daily,
      { [field]: by },
      { [field]: by },
      seedCreatedAt,
    );
  }

  private async commitSearch(query: string): Promise<void> {
    const db = await this.store.getFirestore();
    const { doc, setDoc, increment, serverTimestamp } = await import('firebase/firestore');
    await setDoc(
      doc(db, SITE_ANALYTICS_ROOT, SITE_ANALYTICS_SEARCHES_SUB, toSearchKey(query)),
      { query, count: increment(1), lastSearchedAt: serverTimestamp() },
      { merge: true },
    );
  }

  private async commitPerformance(nav?: PerformanceNavigationTiming): Promise<void> {
    const db = await this.store.getFirestore();
    const { doc, setDoc, serverTimestamp } = await import('firebase/firestore');
    await setDoc(
      doc(db, SITE_ANALYTICS_ROOT, SITE_ANALYTICS_PERFORMANCE_SUB, this.store.todayKey()),
      {
        ttfb: nav ? Math.round(nav.responseStart) : null,
        domContentLoaded: nav ? Math.round(nav.domContentLoadedEventEnd) : null,
        load: nav ? Math.round(nav.loadEventEnd) : null,
        recordedAt: serverTimestamp(),
      },
      { merge: true },
    );
  }

  private attachScrollTracking(): void {
    if (this.scrollAttached) return;
    this.scrollAttached = true;
    let last = 0;
    const onScroll = () => {
      const now = Date.now();
      if (now - last < SCROLL_THROTTLE_MS) return;
      last = now;
      this.trackScroll();
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    this.destroyRef.onDestroy(() => window.removeEventListener('scroll', onScroll));
  }

  private capturePerformance(): void {
    if (this.perfCaptured) return;
    this.perfCaptured = true;
    this.trackPerformance();
  }
}

/** Lower-cased, truncated, URL-safe Firestore doc id for a search query. */
export function toSearchKey(query: string): string {
  return encodeURIComponent(query.toLowerCase().trim().slice(0, SEARCH_KEY_MAX));
}
