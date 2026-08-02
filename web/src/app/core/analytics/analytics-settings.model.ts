/**
 * Master control switches for website analytics.
 *
 * This is the persisted shape of `analyticsSettings/website`. Every field
 * maps 1:1 to a toggle on the Admin → Site Content → Analytics Settings
 * page, and the storefront reads these (cached once at startup) before it
 * records a single event.
 */
export interface AnalyticsSettings {
  /** Global kill-switch — when false NOTHING is recorded, ever. */
  trackingEnabled: boolean;
  /** Hero banner / showcase slide CTA clicks. */
  heroClicks: boolean;
  /** Product card clicks, quick views, product detail views, cart / purchase actions. */
  productClicks: boolean;
  /** Category card / filter clicks. */
  categoryClicks: boolean;
  /** Search queries and search result clicks. */
  searchTracking: boolean;
  /** Wishlist add / remove toggles. */
  wishlistTracking: boolean;
  /** Collection links (New Arrivals, Trending, Shop, etc.). */
  collectionClicks: boolean;
  /** Client-side route navigations. */
  pageViews: boolean;
  /** Deep-scroll events (default OFF). */
  scrollTracking: boolean;
  /** Performance / navigation-timing captures (default OFF). */
  performanceTracking: boolean;
  /** ISO timestamp of the last admin save (read-only for the storefront). */
  updatedAt?: string;
  /** Admin email who last saved the settings (read-only for the storefront). */
  updatedBy?: string;
}

/** The on/off switches, in display order, used by the admin form. */
export const ANALYTICS_SETTING_FIELDS: (keyof AnalyticsSettings)[] = [
  'trackingEnabled',
  'productClicks',
  'heroClicks',
  'categoryClicks',
  'searchTracking',
  'wishlistTracking',
  'collectionClicks',
  'pageViews',
  'scrollTracking',
  'performanceTracking',
];

/** Fallback used before `analyticsSettings/website` has loaded (and on read failure). */
export const DEFAULT_ANALYTICS_SETTINGS: AnalyticsSettings = {
  trackingEnabled: true,
  heroClicks: true,
  productClicks: true,
  categoryClicks: true,
  searchTracking: true,
  wishlistTracking: true,
  collectionClicks: true,
  pageViews: true,
  scrollTracking: false,
  performanceTracking: false,
  updatedAt: '',
  updatedBy: '',
};
