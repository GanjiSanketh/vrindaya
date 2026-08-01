import { Injectable, inject, signal, computed, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { MarketplaceFirebaseService } from '../../features/admin/marketplace/services/marketplace-firebase.service';
import { HeroShowcase, HeroShowcaseItem } from '../models/hero-showcase.model';

/**
 * Storefront hero showcase provider.
 *
 * Loads homepageConfig/active once per browser session and caches it in
 * memory — repeated home-page visits perform zero additional Firestore reads
 * (same lazy-cache pattern as HeroBannerService / ProductService). Never
 * reads Firestore during SSR: the server renders the legacy Hero Banner
 * fallback, and the browser hydrates the showcase as soon as it arrives.
 */
@Injectable({ providedIn: 'root' })
export class HeroShowcaseService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly firebase = inject(MarketplaceFirebaseService);

  private readonly configState = signal<HeroShowcase | null>(null);
  private readonly loadedState = signal(false);
  private loadPromise: Promise<void> | null = null;

  /** The persisted showcase configuration, or null while none is loaded/saved. */
  readonly config = this.configState.asReadonly();
  /** True once the Firestore read has settled (success or failure). */
  readonly loaded = this.loadedState.asReadonly();

  /** The showcase is live when enabled AND at least one item is enabled. */
  readonly enabled = computed<boolean>(() => {
    const config = this.configState();
    return !!config?.enabled && this.activeItems(config).length > 0;
  });

  /** Renderable items, already ordered by displayOrder. */
  readonly items = computed<HeroShowcaseItem[]>(() => {
    const config = this.configState();
    return config ? this.activeItems(config) : [];
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
      const snapshot = await getDoc(doc(db, 'homepageConfig', 'active'));
      if (snapshot.exists()) {
        this.configState.set(this.toConfig(snapshot.data()));
      } else {
        // homepageConfig/active has never been published. The legacy Hero Banner
        // is the intended fallback for this state — NOT an error.
        if (!isPlatformBrowser(this.platformId)) return;
        console.warn('[HeroShowcase] homepageConfig/active does not exist — falling back to the legacy Hero Banner.');
      }
    } catch (err) {
      // A real read failure (permissions, offline, init) — never swallow it
      // silently: the reason the showcase is missing must be visible in the
      // console/Network tab so the root cause can be diagnosed.
      if (!isPlatformBrowser(this.platformId)) return;
      console.error('[HeroShowcase] Firestore read failed — falling back to the legacy Hero Banner.', err);
    } finally {
      this.loadedState.set(true);
    }
  }

  private activeItems(config: HeroShowcase): HeroShowcaseItem[] {
    return config.items
      .filter(item => item.enabled && item.imageUrl?.trim())
      .sort((a, b) => a.displayOrder - b.displayOrder);
  }

  private toConfig(data: Record<string, unknown>): HeroShowcase {
    const raw = (data['heroShowcase'] as Record<string, unknown> | undefined) ?? {};
    const items = Array.isArray(raw['items']) ? (raw['items'] as Record<string, unknown>[]) : [];
    return {
      enabled: (raw['enabled'] as boolean) ?? false,
      autoplay: (raw['autoplay'] as boolean) ?? false,
      pauseOnHover: (raw['pauseOnHover'] as boolean) ?? false,
      rotationIntervalSeconds: this.toInterval(raw['rotationIntervalSeconds']),
      transition: this.toTransition(raw['transition']),
      items: items.map((item, index) => ({
        itemId: (item['itemId'] as string) ?? `item-${index}`,
        imageUrl: (item['imageUrl'] as string) ?? '',
        storagePath: (item['storagePath'] as string) ?? '',
        title: (item['title'] as string) ?? '',
        subtitle: (item['subtitle'] as string) ?? '',
        buttonText: (item['buttonText'] as string) ?? '',
        buttonLink: (item['buttonLink'] as string) ?? '',
        displayOrder: (item['displayOrder'] as number) ?? index + 1,
        enabled: (item['enabled'] as boolean) ?? true,
        createdAt: this.toIsoDate(item['createdAt']),
        updatedAt: this.toIsoDate(item['updatedAt']),
      })),
      createdAt: this.toIsoDate(raw['createdAt']),
      updatedAt: this.toIsoDate(raw['updatedAt']),
      updatedBy: (raw['updatedBy'] as string) ?? '',
    };
  }

  private toInterval(value: unknown): number {
    const n = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(n) && n > 0 ? n : 8;
  }

  private toTransition(value: unknown): HeroShowcase['transition'] {
    return value === 'slide' || value === 'scaleFade' ? value : 'fade';
  }

  private toIsoDate(value: unknown): string {
    if (value && typeof value === 'object' && 'toDate' in value) {
      const date = (value as { toDate: () => Date }).toDate();
      return date?.toISOString?.() ?? '';
    }
    return '';
  }
}
