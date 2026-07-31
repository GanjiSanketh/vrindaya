import type { Timestamp } from 'firebase/firestore';

/**
 * Metrics collected per product. Adding a metric here is all that is required
 * to extend product analytics — the write path, Firestore rules and daily
 * roll-ups are metric-agnostic.
 *
 * `wishlist`, `cart` and `purchase` are schema-ready for future features but
 * are not yet emitted anywhere.
 */
export type ProductMetric = 'detail' | 'flipkart' | 'wishlist' | 'cart' | 'purchase';

/** Metric → field name on the `analytics/{productId}` totals document. */
export const PRODUCT_METRIC_TOTALS_FIELD: Record<ProductMetric, string> = {
  detail:   'totalDetailClicks',
  flipkart: 'totalFlipkartClicks',
  wishlist: 'totalWishlistClicks',
  cart:     'totalCartClicks',
  purchase: 'totalPurchases',
};

/** Metric → field name on the `.../daily/{YYYY-MM-DD}` daily document. */
export const PRODUCT_METRIC_DAILY_FIELD: Record<ProductMetric, string> = {
  detail:   'detailClicks',
  flipkart: 'flipkartClicks',
  wishlist: 'wishlistClicks',
  cart:     'cartClicks',
  purchase: 'purchases',
};

/** Shape of `analytics/{productId}`. */
export interface ProductAnalyticsTotals {
  totalDetailClicks: number;
  totalFlipkartClicks: number;
  totalWishlistClicks: number;
  totalCartClicks: number;
  totalPurchases: number;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  lastClickedAt?: Timestamp;
}

/** Shape of `analytics/{productId}/daily/{YYYY-MM-DD}`. `date` is the document id. */
export interface DailyProductAnalytics {
  date: string;
  detailClicks: number;
  flipkartClicks: number;
  wishlistClicks: number;
  cartClicks: number;
  purchases: number;
  createdAt?: Timestamp;
  lastClickedAt?: Timestamp;
}
