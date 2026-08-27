import { Injectable, inject, signal, PLATFORM_ID, DestroyRef } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, timeout, catchError, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { MarketplaceFirebaseService } from '../../features/admin/marketplace/services/marketplace-firebase.service';
import {
  AnalyticsSettings,
  DEFAULT_ANALYTICS_SETTINGS,
  SAFE_OFF_SETTINGS,
} from './analytics-settings.model';

export const ANALYTICS_SETTINGS_ROOT = 'analyticsSettings';
export const ANALYTICS_SETTINGS_DOC_ID = 'website';

/** Admin-only save endpoint. PUT is the single enforcement boundary for changes — the browser never writes analyticsSettings directly. */
const SETTINGS_URL = `${environment.apiBaseUrl}/analytics-settings`;

/** Ceiling on the API read/write so settings can never wait indefinitely. */
const SETTINGS_REQUEST_TIMEOUT_MS = 5_000;
/** Ceiling on the startup Firestore read — the browser defaults kick in on timeout. */
export const FIRESTORE_READ_TIMEOUT_MS = 8_000;

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
 * `analyticsSettings/website` is read via a live Firestore subscription on the
 * browser (kicked off at app startup) and cached in memory — every tracking
 * check afterwards reads the cached signal, never Firestore. The subscription
 * stays active for the whole session, so the moment an admin saves new values
 * in ANY tab or browser, every open storefront session picks them up
 * immediately; no page reload is needed. SSR/prerender never touches the
 * network; server renders fall back to the fail-closed {@link SAFE_OFF_SETTINGS}
 * and the browser hydrates the real settings as soon as the first snapshot
 * arrives.
 *
 * FAIL-CLOSED: until a snapshot — or the backend API fallback — proves the
 * persisted document enables a switch, every switch is OFF, so a storefront
 * that can reach neither Firestore nor the API records nothing instead of
 * silently defaulting to "tracking on". The persisted document is the only
 * way tracking turns on.
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
  private readonly destroyRef = inject(DestroyRef);

  private readonly settingsState = signal<AnalyticsSettings>(SAFE_OFF_SETTINGS);
  private readonly loadedState = signal(false);
  private loadPromise: Promise<AnalyticsSettings> | null = null;

  /** Cached settings — the single source of truth for every tracking check. */
  readonly settings = this.settingsState.asReadonly();
  /** True once the first settings snapshot has settled (success, timeout or failure). */
  readonly loaded = this.loadedState.asReadonly();

  /**
   * Starts the live settings subscription. Safe to call from anywhere, any
   * number of times — only the first call opens the subscription. Resolves
   * as soon as the first snapshot (or a timeout/error fallback) lands.
   * Returns immediately (no-op) during SSR/prerender.
   */
  ensureLoaded(): Promise<AnalyticsSettings> {
    if (this.loadPromise) return this.loadPromise;
    if (!isPlatformBrowser(this.platformId)) {
      return Promise.resolve(this.settingsState());
    }
    this.loadPromise = this.subscribe();
    return this.loadPromise;
  }

  /**
   * Always reads `analyticsSettings/website` from the backend API (which uses
   * the service account), bypassing the startup cache. Used by the admin
   * settings page so it always shows the current persisted state even if it
   * was changed in another tab.
   */
  async loadFresh(): Promise<AnalyticsSettings> {
    // Never runs on the server — the admin routes are RenderMode.Client, but
    // guard anyway so no SSR path can ever block on this network call.
    if (!isPlatformBrowser(this.platformId)) {
      console.warn('[AnalyticsSettingsService] loadFresh() skipped during SSR/prerender — returning defaults.');
      return DEFAULT_ANALYTICS_SETTINGS;
    }
    const dto = await this.fetchFromApi();
    const settings = this.mapDtoToSettings(dto ?? { ...DEFAULT_ANALYTICS_SETTINGS });
    this.applyToCache(settings);
    return settings;
  }

  /**
   * Reads `analyticsSettings/website` from the backend API (service-account
   * Firestore). Returns `null` when the read fails or times out — the caller
   * decides the fallback (the admin page falls back to packaged defaults; the
   * storefront stays fail-closed). Defaults are never substituted here, so a
   * transient API failure can never be mistaken for persisted data.
   */
  private async fetchFromApi(): Promise<AnalyticsSettingsDto | null> {
    try {
      return await firstValueFrom(
        this.http.get<AnalyticsSettingsDto>(SETTINGS_URL).pipe(
          timeout(SETTINGS_REQUEST_TIMEOUT_MS),
          catchError(() => of<AnalyticsSettingsDto | null>(null)),
        ),
      );
    } catch {
      return null;
    }
  }

  /**
   * Subscribes to live updates of `analyticsSettings/website` so the in-memory
   * cache always mirrors the persisted document. The first snapshot resolves
   * `ensureLoaded()`; every later snapshot — an admin save from ANY tab or
   * browser — rewrites the cache immediately, so the storefront stops/starts
   * recording without a reload. If the initial snapshot never arrives
   * (offline / timeout) or the read fails (permissions / first-run), the
   * backend API is queried for the persisted document first; only if that
   * also fails do the fail-closed {@link SAFE_OFF_SETTINGS} apply (nothing
   * recorded). The subscription stays alive to recover as soon as
   * connectivity returns.
   */
  private subscribe(): Promise<AnalyticsSettings> {
    return new Promise<AnalyticsSettings>((resolve) => {
      void this.firebase.getFirestore()
        .then(async (db) => {
          const { onSnapshot, doc } = await import('firebase/firestore');
          const ref = doc(db, ANALYTICS_SETTINGS_ROOT, ANALYTICS_SETTINGS_DOC_ID);

          let settled = false;
          let unsubscribe: () => void = () => {};

          const timer = setTimeout(async () => {
            // No snapshot within the bound — fall back to the backend API so
            // a storefront whose Firestore listener cannot settle still
            // receives the persisted settings. Keep listening; the cache is
            // refreshed the moment a snapshot arrives.
            if (settled) return;
            settled = true;
            const fallback = await this.fetchFromApi();
            if (fallback) {
              const settings = this.mapDtoToSettings(fallback);
              this.applyToCache(settings);
            } else {
              console.warn(
                '[AnalyticsSettingsService] analyticsSettings/website snapshot did not settle within ' +
                  `${FIRESTORE_READ_TIMEOUT_MS}ms and the backend API fallback failed — using SAFE_OFF (tracking disabled).`,
              );
              this.applyToCache(SAFE_OFF_SETTINGS);
            }
            resolve(this.settingsState());
          }, FIRESTORE_READ_TIMEOUT_MS);

          const settle = (): void => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            resolve(this.settingsState());
          };

          unsubscribe = onSnapshot(
            ref,
            snapshot => {
              const data = snapshot.exists() ? snapshot.data() : {};
              const settings = this.toSettings(data);
              this.applyToCache(settings);
              settle();
            },
            () => {
              // Read failed (offline / permissions / first-run) — query the
              // backend API (service account) for the persisted document, then
              // fail-closed only if that also fails.
              void this.fetchFromApi().then(fallback => {
                if (fallback) {
                  this.applyToCache(this.mapDtoToSettings(fallback));
                } else {
                  console.warn('[AnalyticsSettingsService] analyticsSettings/website snapshot failed and the backend API fallback failed — using SAFE_OFF (tracking disabled).');
                  this.applyToCache(SAFE_OFF_SETTINGS);
                }
                settle();
              });
            },
          );

          this.destroyRef.onDestroy(() => {
            clearTimeout(timer);
            unsubscribe();
          });
        })
        .catch(() => {
          // getFirestore() itself failed — never hang startup, and stay
          // fail-closed so nothing is recorded.
          console.warn('[AnalyticsSettingsService] getFirestore() failed — using SAFE_OFF (tracking disabled).');
          this.applyToCache(SAFE_OFF_SETTINGS);
          resolve(this.settingsState());
        });
    });
  }

  /**
   * Persists the full toggle state through the admin-only API endpoint
   * (authTokenInterceptor attaches the AppJwt Bearer header; the backend
   * enforces the AdminOnly policy and stamps updatedAt/updatedBy from the
   * authenticated identity). The cache is refreshed with the result so the
   * storefront picks up the change without a second read.
   */
  async save(payload: Omit<AnalyticsSettings, 'updatedAt' | 'updatedBy'>): Promise<AnalyticsSettings> {
    // No catchError fallback here: a failed save MUST surface as an error so
    // the admin page can show it — the timeout below is the only bound needed.
    const updated = await firstValueFrom(
      this.http.put<AnalyticsSettings>(SETTINGS_URL, payload).pipe(timeout(SETTINGS_REQUEST_TIMEOUT_MS)),
    );
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

  /**
   * Maps a Firestore snapshot to {@link AnalyticsSettings}. Missing booleans
   * fail-closed to OFF (the persisted document is the only way a switch turns
   * on), matching the {@link SAFE_OFF_SETTINGS} runtime default.
   */
  private toSettings(data: Record<string, unknown>): AnalyticsSettings {
    return {
      trackingEnabled: this.bool(data['trackingEnabled'], false),
      heroClicks: this.bool(data['heroClicks'], false),
      productClicks: this.bool(data['productClicks'], false),
      categoryClicks: this.bool(data['categoryClicks'], false),
      searchTracking: this.bool(data['searchTracking'], false),
      wishlistTracking: this.bool(data['wishlistTracking'], false),
      collectionClicks: this.bool(data['collectionClicks'], false),
      pageViews: this.bool(data['pageViews'], false),
      scrollTracking: this.bool(data['scrollTracking'], false),
      performanceTracking: this.bool(data['performanceTracking'], false),
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
