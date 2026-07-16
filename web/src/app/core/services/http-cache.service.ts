import { Injectable } from '@angular/core';
import { Observable, shareReplay } from 'rxjs';

interface CacheEntry<T> {
  expiresAt: number;
  obs: Observable<T>;
}

/**
 * Generic TTL cache + in-flight de-dupe for public GET requests
 * (listings/categories/product detail). `shareReplay` means concurrent
 * callers for the same key share one underlying HTTP call instead of firing
 * duplicates; the Map entry itself expires after `ttlMs` so later calls
 * re-fetch fresh data.
 */
@Injectable({ providedIn: 'root' })
export class HttpCacheService {
  private readonly entries = new Map<string, CacheEntry<unknown>>();

  get<T>(key: string, factory: () => Observable<T>, ttlMs: number): Observable<T> {
    const existing = this.entries.get(key) as CacheEntry<T> | undefined;
    if (existing && existing.expiresAt > Date.now()) {
      return existing.obs;
    }

    const obs = factory().pipe(shareReplay({ bufferSize: 1, refCount: false }));
    this.entries.set(key, { expiresAt: Date.now() + ttlMs, obs });
    return obs;
  }

  /** Drops a single cached entry (e.g. after a mutation that should force a refetch) or clears everything if no key is given. */
  invalidate(key?: string): void {
    if (key) this.entries.delete(key);
    else this.entries.clear();
  }
}
