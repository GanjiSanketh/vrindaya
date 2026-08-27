import { Injectable, inject, PLATFORM_ID, DestroyRef } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';
import { AnalyticsSettingsService } from './analytics-settings.service';

/**
 * GA4 (gtag.js) ecommerce event layer.
 *
 * Reads the browser-global `window.dataLayer` pushed by the gtag.js snippet
 * in index.html. Every method is a no-op during SSR and when the user has
 * not consented (the existing AnalyticsSettingsService gate is respected).
 *
 * The gtag config in index.html is initialised with `send_page_view: false`
 * because Angular owns SPA page-view tracking via {@link trackPageView}.
 */
@Injectable({ providedIn: 'root' })
export class Ga4Service {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly settingsSvc = inject(AnalyticsSettingsService);
  private readonly router = inject(Router);
  private readonly title = inject(Title);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => this.trackPageView());
  }

  /* ── Page views ────────────────────────────────────────────── */

  /** Fires a GA4 `page_view` event on every SPA navigation. */
  trackPageView(): void {
    if (!this.canTrack()) return;
    const pageTitle = this.title.getTitle();
    this.push('event', 'page_view', {
      page_title: pageTitle,
      page_location: window.location.href,
      page_path: window.location.pathname,
    });
  }

  /* ── Product list events ───────────────────────────────────── */

  /** `view_item_list` — products displayed in a list/grid context. */
  trackViewItemList(items: Ga4ProductItem[], listId: string, listName: string): void {
    if (!this.canTrack()) return;
    this.push('event', 'view_item_list', {
      item_list_id: listId,
      item_list_name: listName,
      items,
    });
  }

  /** `select_item` — a product was clicked/selected from a list. */
  trackSelectItem(item: Ga4ProductItem, listId: string, listName: string): void {
    if (!this.canTrack()) return;
    this.push('event', 'select_item', {
      item_list_id: listId,
      item_list_name: listName,
      items: [item],
    });
  }

  /* ── Product detail events ─────────────────────────────────── */

  /** `view_item` — a product detail page was viewed. */
  trackViewItem(item: Ga4ProductItem): void {
    if (!this.canTrack()) return;
    this.push('event', 'view_item', {
      currency: 'INR',
      value: item.price,
      items: [item],
    });
  }

  /* ── Cart events ───────────────────────────────────────────── */

  /** `add_to_cart` — an item was added. */
  trackAddToCart(items: Ga4ProductItem[], value: number): void {
    if (!this.canTrack()) return;
    this.push('event', 'add_to_cart', {
      currency: 'INR',
      value,
      items,
    });
  }

  /** `remove_from_cart` — an item was removed. */
  trackRemoveFromCart(items: Ga4ProductItem[], value: number): void {
    if (!this.canTrack()) return;
    this.push('event', 'remove_from_cart', {
      currency: 'INR',
      value,
      items,
    });
  }

  /** `view_cart` — the cart was viewed. */
  trackViewCart(items: Ga4ProductItem[], value: number): void {
    if (!this.canTrack()) return;
    this.push('event', 'view_cart', {
      currency: 'INR',
      value,
      items,
    });
  }

  /* ── Checkout / Purchase ───────────────────────────────────── */

  /** `begin_checkout` — user started checkout. */
  trackBeginCheckout(items: Ga4ProductItem[], value: number): void {
    if (!this.canTrack()) return;
    this.push('event', 'begin_checkout', {
      currency: 'INR',
      value,
      items,
    });
  }

  /** `purchase` — order confirmed. Must be idempotent (pass transactionId). */
  trackPurchase(params: Ga4PurchaseParams): void {
    if (!this.canTrack()) return;
    this.push('event', 'purchase', {
      transaction_id: params.transactionId,
      currency: 'INR',
      value: params.value,
      tax: params.tax ?? 0,
      shipping: params.shipping ?? 0,
      items: params.items,
    });
  }

  /* ── Wishlist ──────────────────────────────────────────────── */

  /** `add_to_wishlist` — an item was wishlisted. */
  trackAddToWishlist(item: Ga4ProductItem): void {
    if (!this.canTrack()) return;
    this.push('event', 'add_to_wishlist', {
      currency: 'INR',
      value: item.price,
      items: [item],
    });
  }

  /* ── Search ────────────────────────────────────────────────── */

  /** `search` — a search was performed. */
  trackSearch(searchTerm: string): void {
    if (!this.canTrack()) return;
    this.push('event', 'search', { search_term: searchTerm });
  }

  /* ── Conversion helpers (Flipkart redirect) ────────────────── */

  /** `flipkart_redirect` — custom event when user clicks Buy on Flipkart. */
  trackFlipkartRedirect(item: Ga4ProductItem): void {
    if (!this.canTrack()) return;
    this.push('event', 'flipkart_redirect', {
      currency: 'INR',
      value: item.price,
      items: [item],
    });
  }

  /* ── Scroll / Engagement ───────────────────────────────────── */

  /** `scroll_depth` — custom event at 25%/50%/75%/100% thresholds. */
  trackScrollDepth(percent: number): void {
    if (!this.canTrack()) return;
    this.push('event', 'scroll_depth', { percent });
  }

  /* ── Internal ──────────────────────────────────────────────── */

  private canTrack(): boolean {
    if (!isPlatformBrowser(this.platformId)) return false;
    const s = this.settingsSvc.settings();
    return s.trackingEnabled && (s.productClicks || s.pageViews);
  }

  private push(...args: unknown[]): void {
    const w = window as unknown as { dataLayer?: unknown[][] };
    w.dataLayer?.push(args);
  }
}

/* ── Shared types ────────────────────────────────────────────── */

export interface Ga4ProductItem {
  /** Product ID from the backend. */
  item_id: string;
  /** Display name. */
  item_name: string;
  /** Category path (e.g. "Ethnic > Kurtas"). */
  item_category?: string;
  /** Brand name if known. */
  item_brand?: string;
  /** Price in INR. */
  price: number;
  /** Size or variant if selected. */
  item_variant?: string;
  /** Position in the list (1-indexed). */
  index?: number;
  /** Quantity (default 1). */
  quantity?: number;
}

export interface Ga4PurchaseParams {
  transactionId: string;
  value: number;
  tax?: number;
  shipping?: number;
  items: Ga4ProductItem[];
}
