import { Injectable, inject, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { MarketplaceFirebaseService } from '../../features/admin/marketplace/services/marketplace-firebase.service';
import {
  AnalyticsSettings,
  DEFAULT_ANALYTICS_SETTINGS,
} from './analytics-settings.model';

export const ANALYTICS_SETTINGS_ROOT = 'analyticsSettings';
export const ANALYTICS_SETTINGS_DOC_ID = 'website';

/** Admin-only save endpoint. PUT is the single enforcement boundary for changes — the browser never writes analyticsSettings directly. */
const SETTINGS_URL = `${environment.apiBaseUrl}/analytics-settings`;

/** Raw DTO shape returned by the API — accepts camelCase or PascalCase variants. */
interface AnalyticsSettingsDto {
  trackingEnabled?: boolean;
  heroClicks?: boolean;
  productClicks?: boolean;
  categoryClicks?: boolean;
  searchTracking?: boolean;
  wishlistTracking?: boolean;
  collectionClicks?: boolean;
  pageViews?: boolean;
  scrollTracking?: boolean;
  performanceTracking?: boolean;
  updatedAt?: string;
  updatedBy?: string;
  TrackingEnabled?: boolean;
  HeroClicks?: boolean;
  ProductClicks?: boolean;
  CategoryClicks?: boolean;
  SearchTracking?: boolean;
  WishlistTracking?: boolean;
  CollectionClicks?: boolean;
  PageViews?: boolean;
  ScrollTracking?: boolean;
  PerformanceTracking?: boolean;
  UpdatedAt?: string;
  UpdatedBy?: string;
}

/**
 * Singleton owner of the website analytics configuration.
 *
 * `analyticsSettings/website` is read exactly ONCE per browser session
 * (kicked off at app startup) and cached in memory — every tracking check
 * afterwards reads the cached signal, never Firestore. SSR/prerender never
 * touches the network; server renders fall back to the packaged defaults
 * and the browser hydrates the real settings as soon as they arrive.
 *
 * Write access is admin-only and enforced by the backend: the admin page
 * sits behind the adminAuthGuard, and saving goes through the admin-only API
 * endpoint, never through a direct browser Firestore write.
 */
@Injectable({ providedIn: 'root' })
export class AnalyticsSettingsService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly firebase = inject(MarketplaceFirebaseService);
  private readonly http = inject(HttpClient);

  private readonly settingsState = signal<AnalyticsSettings>(DEFAULT_ANALYTICS_SETTINGS);
  private readonly loadedState = signal(false);
  private loadPromise: Promise<AnalyticsSettings> | null = null;

  /** Cached settings — the single source of truth for every tracking check. */
  readonly settings = this.settingsState.asReadonly();
  /** True once the one-time Firestore read has settled (success or failure). */
  readonly loaded = this.loadedState.asReadonly();

  /**
   * Fetches the settings once. Safe to call from anywhere, any number of
   * times — only the first call touches the network. Returns immediately
   * (no-op) during SSR/prerender.
   */
  ensureLoaded(): Promise<AnalyticsSettings> {
    if (this.loadPromise) return this.loadPromise;
    if (!isPlatformBrowser(this.platformId)) {
      return Promise.resolve(this.settingsState());
    }
    this.loadPromise = this.read();
    return this.loadPromise;
  }

  /**
   * Always reads `analyticsSettings/website` from the backend API (which uses
   * the service account), bypassing the startup cache. Used by the admin
   * settings page so it always shows the current persisted state even if it
   * was changed in another tab.
   */
  async loadFresh(): Promise<AnalyticsSettings> {
    const dto = await firstValueFrom(this.http.get<AnalyticsSettingsDto>(SETTINGS_URL));
    const settings = this.mapDtoToSettings(dto);
    this.applyToCache(settings);
    return settings;
  }

  /**
   * Reads directly from Firestore (used by storefront at startup).
   * Not used by admin page — see loadFresh().
   */
  private async read(): Promise<AnalyticsSettings> {
    try {
      const db = await this.firebase.getFirestore();
      const { getDoc, doc } = await import('firebase/firestore');
      const snapshot = await getDoc(doc(db, ANALYTICS_SETTINGS_ROOT, ANALYTICS_SETTINGS_DOC_ID));
      const data = snapshot.exists() ? snapshot.data() : {};
      return this.toSettings(data);
    } catch {
      // Read failed (offline / first-run / permissions) — keep the documented
      // defaults so tracking behaviour is predictable instead of silently off.
      return DEFAULT_ANALYTICS_SETTINGS;
    } finally {
      this.loadedState.set(true);
    }
  }

  /**
   * Persists the full toggle state through the admin-only API endpoint
   * (authTokenInterceptor attaches the AppJwt Bearer header; the backend
   * enforces the AdminOnly policy and stamps updatedAt/updatedBy from the
   * authenticated identity). The cache is refreshed with the result so the
   * storefront picks up the change without a second read.
   */
  async save(payload: Omit<AnalyticsSettings, 'updatedAt' | 'updatedBy'>): Promise<AnalyticsSettings> {
    const updated = await firstValueFrom(this.http.put<AnalyticsSettings>(SETTINGS_URL, payload));
    this.applyToCache(updated);
    return updated;
  }

  private mapDtoToSettings(dto: AnalyticsSettingsDto): AnalyticsSettings {
    return {
      trackingEnabled: dto.trackingEnabled ?? dto.TrackingEnabled ?? DEFAULT_ANALYTICS_SETTINGS.trackingEnabled,
      heroClicks: dto.heroClicks ?? dto.HeroClicks ?? DEFAULT_ANALYTICS_SETTINGS.heroClicks,
      productClicks: dto.productClicks ?? dto.ProductClicks ?? DEFAULT_ANALYTICS_SETTINGS.productClicks,
      categoryClicks: dto.categoryClicks ?? dto.CategoryClicks ?? DEFAULT_ANALYTICS_SETTINGS.categoryClicks,
      searchTracking: dto.searchTracking ?? dto.SearchTracking ?? DEFAULT_ANALYTICS_SETTINGS.searchTracking,
      wishlistTracking: dto.wishlistTracking ?? dto.WishlistTracking ?? DEFAULT_ANALYTICS_SETTINGS.wishlistTracking,
      collectionClicks: dto.collectionClicks ?? dto.CollectionClicks ?? DEFAULT_ANALYTICS_SETTINGS.collectionClicks,
      pageViews: dto.pageViews ?? dto.PageViews ?? DEFAULT_ANALYTICS_SETTINGS.pageViews,
      scrollTracking: dto.scrollTracking ?? dto.ScrollTracking ?? DEFAULT_ANALYTICS_SETTINGS.scrollTracking,
      performanceTracking: dto.performanceTracking ?? dto.PerformanceTracking ?? DEFAULT_ANALYTICS_SETTINGS.performanceTracking,
      updatedAt: dto.updatedAt ?? dto.UpdatedAt ?? '',
      updatedBy: dto.updatedBy ?? dto.UpdatedBy ?? '',
    };
  }

  private toSettings(data: Record<string, unknown>): AnalyticsSettings {
    return {
      trackingEnabled: this.bool(data['trackingEnabled'], DEFAULT_ANALYTICS_SETTINGS.trackingEnabled),
      heroClicks: this.bool(data['heroClicks'], DEFAULT_ANALYTICS_SETTINGS.heroClicks),
      productClicks: this.bool(data['productClicks'], DEFAULT_ANALYTICS_SETTINGS.productClicks),
      categoryClicks: this.bool(data['categoryClicks'], DEFAULT_ANALYTICS_SETTINGS.categoryClicks),
      searchTracking: this.bool(data['searchTracking'], DEFAULT_ANALYTICS_SETTINGS.searchTracking),
      wishlistTracking: this.bool(data['wishlistTracking'], DEFAULT_ANALYTICS_SETTINGS.wishlistTracking),
      collectionClicks: this.bool(data['collectionClicks'], DEFAULT_ANALYTICS_SETTINGS.collectionClicks),
      pageViews: this.bool(data['pageViews'], DEFAULT_ANALYTICS_SETTINGS.pageViews),
      scrollTracking: this.bool(data['scrollTracking'], DEFAULT_ANALYTICS_SETTINGS.scrollTracking),
      performanceTracking: this.bool(data['performanceTracking'], DEFAULT_ANALYTICS_SETTINGS.performanceTracking),
      updatedAt: this.string(data['updatedAt']),
      updatedBy: this.string(data['updatedBy']),
    };
  }

  private applyToCache(settings: AnalyticsSettings): void {
    this.settingsState.set(settings);
    this.loadedState.set(true);
  }

  private bool(value: unknown, fallback: boolean): boolean {
    return typeof value === 'boolean' ? value : fallback;
  }

  private string(value: unknown): string {
    return typeof value === 'string' ? value : '';
  }
}
