import { Injectable, inject, signal, computed, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { MarketplaceFirebaseService } from '../../features/admin/marketplace/services/marketplace-firebase.service';
import { HeroBanner } from '../models/hero-banner.model';

/** The storefront fallback banner shown while no published Firestore banner exists (or until it loads). */
export const DEFAULT_HERO_DESKTOP = 'assets/hero/hero-banner.webp';

/**
 * Storefront hero banner provider.
 *
 * Loads the single active banner from Firestore (heroBanners/active) exactly
 * once per browser session and caches it in memory — repeated home-page
 * visits perform zero additional Firestore reads (same lazy-cache pattern as
 * ProductService.ensureHomeDataLoaded). Never reads Firestore during SSR:
 * server renders fall back to the packaged asset banner, and the browser
 * hydrates the published banner as soon as it arrives.
 */
@Injectable({ providedIn: 'root' })
export class HeroBannerService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly firebase = inject(MarketplaceFirebaseService);

  private readonly bannerState = signal<HeroBanner | null>(null);
  private readonly loadedState = signal(false);
  private loadPromise: Promise<void> | null = null;

  /** The published banner document, or null while none is loaded/published. */
  readonly banner = this.bannerState.asReadonly();
  /** True once the Firestore read has settled (success or failure). */
  readonly loaded = this.loadedState.asReadonly();

  /** URL for wide screens — the published desktop image, or the asset fallback. */
  readonly desktopSrc = computed<string>(() => {
    const banner = this.bannerState();
    if (banner?.isPublished && banner.desktopImageUrl) return banner.desktopImageUrl;
    return DEFAULT_HERO_DESKTOP;
  });

  /** URL for narrow screens — the published mobile image, or desktop/fallback. */
  readonly mobileSrc = computed<string>(() => {
    const banner = this.bannerState();
    if (banner?.isPublished && banner.mobileImageUrl) return banner.mobileImageUrl;
    return this.desktopSrc();
  });

  /**
   * Kicks off the one-time Firestore read. Safe to call from anywhere and any
   * number of times; only the first call touches the network. Resolves
   * immediately (no-op) during SSR/prerender.
   */
  ensureLoaded(): Promise<void> {
    if (this.loadPromise) return this.loadPromise;
    if (!isPlatformBrowser(this.platformId)) return Promise.resolve();
    this.loadPromise = this.load();
    return this.loadPromise;
  }

  private async load(): Promise<void> {
    try {
      const db = await this.firebase.getFirestore();
      const { getDoc, doc } = await import('firebase/firestore');
      const snapshot = await getDoc(doc(db, 'heroBanners', 'active'));
      if (snapshot.exists()) {
        this.bannerState.set(this.toBanner(snapshot.data()));
      }
    } catch {
      // Firestore read failed (offline/denied) — keep the packaged fallback.
    } finally {
      this.loadedState.set(true);
    }
  }

  private toBanner(data: Record<string, unknown>): HeroBanner {
    return {
      desktopImageUrl: (data['desktopImageUrl'] as string) ?? '',
      mobileImageUrl: (data['mobileImageUrl'] as string) ?? '',
      desktopStoragePath: (data['desktopStoragePath'] as string) ?? '',
      mobileStoragePath: (data['mobileStoragePath'] as string) ?? '',
      isPublished: (data['isPublished'] as boolean) ?? false,
      createdAt: this.toIsoDate(data['createdAt']),
      updatedAt: this.toIsoDate(data['updatedAt']),
      updatedBy: (data['updatedBy'] as string) ?? '',
    };
  }

  private toIsoDate(value: unknown): string {
    if (value && typeof value === 'object' && 'toDate' in value) {
      const date = (value as { toDate: () => Date }).toDate();
      return date?.toISOString?.() ?? '';
    }
    return '';
  }
}
