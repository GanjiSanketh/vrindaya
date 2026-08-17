import { Injectable, inject, signal, computed, PLATFORM_ID, DestroyRef } from '@angular/core';
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
 * Opens ONE live Firestore subscription to homepageConfig/active per browser
 * session and caches the result in memory — repeated home-page visits perform
 * zero additional Firestore reads (same lazy-cache pattern as
 * HeroShowcaseService / ProductService, and the same live-subscription
 * pattern as AnalyticsSettingsService). Never reads Firestore during SSR:
 * the server renders the built-in defaults, and the browser hydrates the
 * admin-managed story as soon as the first snapshot arrives.
 *
 * Reliability contract — a live subscription instead of a one-shot getDoc:
 * a transient read failure (Firebase init race on the lazy firebase chunk,
 * network blip, backend 503) can never pin the section to the built-in
 * defaults for the rest of the session. The Firestore SDK keeps the
 * subscription alive and reconnects with its own backoff, and the next
 * snapshot simply rewrites the cache — no app-level timers or retry loops.
 * An admin save in ANY tab also propagates to every open storefront session
 * without a reload. Only an outright getFirestore() init failure stops the
 * subscription, and that failure is forgotten (loadPromise reset) so a later
 * visit (route re-entry) retries the whole subscription.
 */
@Injectable({ providedIn: 'root' })
export class VrindayaStoryService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly firebase = inject(MarketplaceFirebaseService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly configState = signal<VrindayaStoryConfig | null>(null);
  private readonly loadedState = signal(false);
  private readonly errorState = signal<string | null>(null);
  private loadPromise: Promise<void> | null = null;
  private unsubscribe: (() => void) | null = null;

  /** The persisted story configuration, or null while none is loaded/saved. */
  readonly config = this.configState.asReadonly();
  /** True once the first snapshot has settled (success or failure). */
  readonly loaded = this.loadedState.asReadonly();
  /** Failure reason while the subscription is erroring, or null after a snapshot. */
  readonly error = this.errorState.asReadonly();

  /** Renderable beats, already ordered by displayOrder. */
  readonly items = computed<VrindayaStoryItem[]>(() => {
    const config = this.configState();
    return config ? this.activeItems(config) : [];
  });

  /**
   * Kicks off the one-time live subscription. Safe to call from anywhere and
   * any number of times; only the first call touches the network. Resolves
   * as soon as the first snapshot (or a failure) settles. Resolves
   * immediately (no-op) during SSR/prerender.
   */
  ensureLoaded(): Promise<void> {
    if (this.loadPromise) return this.loadPromise;
    if (!isPlatformBrowser(this.platformId)) return Promise.resolve();
    this.loadPromise = this.subscribe();
    return this.loadPromise;
  }

  private subscribe(): Promise<void> {
    return new Promise<void>((resolve) => {
      void this.firebase
        .getFirestore()
        .then(async (db) => {
          const { onSnapshot, doc } = await import('firebase/firestore');
          const ref = doc(db, 'homepageConfig', 'active');

          this.unsubscribe = onSnapshot(
            ref,
            (snapshot) => {
              // Any snapshot — including "document does not exist" — is the
              // source of truth: it clears an earlier transient error and
              // settles the load. Later snapshots (an admin save in any tab,
              // a reconnection after a blip) simply rewrite the cache.
              if (snapshot.exists()) {
                this.configState.set(this.toConfig(snapshot.data()));
              }
              // No config yet is NOT an error — the storefront falls back to defaults.
              this.errorState.set(null);
              this.loadedState.set(true);
              resolve();
            },
            (err) => {
              // The SDK keeps the subscription alive and reconnects with its
              // own backoff; surface the reason for diagnosis without pinning
              // the section — the next snapshot rewrites the cache.
              if (isPlatformBrowser(this.platformId)) {
                console.error(
                  '[VrindayaStory] Firestore snapshot error — the live subscription will retry and recover.',
                  err,
                );
              }
              this.errorState.set('Unable to load the Vrindaya Story configuration.');
              this.loadedState.set(true);
              resolve();
            },
          );

          this.destroyRef.onDestroy(() => {
            this.unsubscribe?.();
            this.unsubscribe = null;
          });
        })
        .catch((err) => {
          // getFirestore() itself failed (lazy firebase chunk/init race).
          // Forget the failed attempt so a later visit (route re-entry) retries
          // the whole subscription instead of pinning the section to defaults
          // for the rest of the session.
          if (isPlatformBrowser(this.platformId)) {
            console.error('[VrindayaStory] getFirestore() failed — the next visit will retry.', err);
          }
          this.errorState.set('Unable to load the Vrindaya Story configuration.');
          this.loadedState.set(true);
          this.loadPromise = null;
          resolve();
        });
    });
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
