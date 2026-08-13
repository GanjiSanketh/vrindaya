import { Injectable, inject, signal, computed, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { MarketplaceFirebaseService } from '../../features/admin/marketplace/services/marketplace-firebase.service';
import {
  VrindayaStoryConfig,
  VrindayaStoryItem,
  VrindayaStoryPosition,
} from '../models/vrindaya-story.model';

/**
 * Storefront Vrindaya Story provider.
 *
 * Loads homepageConfig/active once per browser session and caches it in
 * memory — repeated home-page visits perform zero additional Firestore reads
 * (same lazy-cache pattern as HeroShowcaseService / ProductService). Never
 * reads Firestore during SSR: the server renders the built-in defaults, and
 * the browser hydrates the admin-managed story as soon as it arrives.
 */
@Injectable({ providedIn: 'root' })
export class VrindayaStoryService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly firebase = inject(MarketplaceFirebaseService);

  private readonly configState = signal<VrindayaStoryConfig | null>(null);
  private readonly loadedState = signal(false);
  private loadPromise: Promise<void> | null = null;

  /** The persisted story configuration, or null while none is loaded/saved. */
  readonly config = this.configState.asReadonly();
  /** True once the Firestore read has settled (success or failure). */
  readonly loaded = this.loadedState.asReadonly();

  /** Renderable beats, already ordered by displayOrder. */
  readonly items = computed<VrindayaStoryItem[]>(() => {
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
      }
      // No config yet is NOT an error — the storefront falls back to defaults.
    } catch (err) {
      // A real read failure (permissions, offline, init) — never swallow it
      // silently: the reason the story is missing must be visible in the
      // console so the root cause can be diagnosed.
      if (!isPlatformBrowser(this.platformId)) return;
      console.error('[VrindayaStory] Firestore read failed — falling back to built-in story defaults.', err);
    } finally {
      this.loadedState.set(true);
    }
  }

  private activeItems(config: VrindayaStoryConfig): VrindayaStoryItem[] {
    return config.items
      .filter(item => item.isActive && item.imageUrl?.trim())
      .sort((a, b) => a.displayOrder - b.displayOrder);
  }

  private toConfig(data: Record<string, unknown>): VrindayaStoryConfig {
    const raw = (data['vrindayaStory'] as Record<string, unknown> | undefined) ?? {};
    const items = Array.isArray(raw['items']) ? (raw['items'] as Record<string, unknown>[]) : [];
    return {
      items: items.map((item, index) => ({
        storyId: (item['storyId'] as string) ?? `story-${index + 1}`,
        storyNumber: (item['storyNumber'] as string) ?? String(index + 1).padStart(2, '0'),
        title: (item['title'] as string) ?? '',
        description: (item['description'] as string) ?? '',
        imageUrl: (item['imageUrl'] as string) ?? '',
        imageAlt: (item['imageAlt'] as string) ?? '',
        imagePosition: this.toPosition(item['imagePosition']),
        displayOrder: (item['displayOrder'] as number) ?? index + 1,
        isActive: (item['isActive'] as boolean) ?? true,
        storagePath: (item['storagePath'] as string) ?? '',
        createdAt: this.toIsoDate(item['createdAt']),
        updatedAt: this.toIsoDate(item['updatedAt']),
      })),
      createdAt: this.toIsoDate(raw['createdAt']),
      updatedAt: this.toIsoDate(raw['updatedAt']),
      updatedBy: (raw['updatedBy'] as string) ?? '',
    };
  }

  private toPosition(value: unknown): VrindayaStoryPosition {
    return value === 'top' || value === 'bottom' || value === 'left' || value === 'right'
      ? value
      : 'center';
  }

  private toIsoDate(value: unknown): string {
    if (value && typeof value === 'object' && 'toDate' in value) {
      const date = (value as { toDate: () => Date }).toDate();
      return date?.toISOString?.() ?? '';
    }
    return '';
  }
}
