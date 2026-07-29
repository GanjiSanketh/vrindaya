import { Injectable } from '@angular/core';
import { Observable, shareReplay } from 'rxjs';

interface CacheEntry<T> {
  expiresAt: number;
  obs: Observable<T>;
}

const DEFAULT_MAX_ENTRIES = 200;

@Injectable({ providedIn: 'root' })
export class HttpCacheService {
  private readonly entries   = new Map<string, CacheEntry<unknown>>();
  private readonly keys: string[] = [];
  private readonly maxEntries: number;
  /** Session-scoped cache — data lives here until the tab closes (never expires). */
  private readonly session = new Map<string, unknown>();

  constructor() {
    this.maxEntries = DEFAULT_MAX_ENTRIES;
  }

  get<T>(key: string, factory: () => Observable<T>, ttlMs: number): Observable<T> {
    const existing = this.entries.get(key) as CacheEntry<T> | undefined;
    if (existing && existing.expiresAt > Date.now()) {
      this.touch(key);
      return existing.obs;
    }
    const obs = factory().pipe(shareReplay({ bufferSize: 1, refCount: false }));
    this.evictIfNeeded();
    this.entries.set(key, { expiresAt: Date.now() + ttlMs, obs });
    this.keys.push(key);
    return obs;
  }

  setSession<T>(key: string, value: T): void { this.session.set(key, value); }
  getSession<T>(key: string): T | undefined { return this.session.get(key) as T; }
  hasSession(key: string): boolean { return this.session.has(key); }

  invalidate(key?: string): void {
    if (key) { this.entries.delete(key); const i = this.keys.indexOf(key); if (i !== -1) this.keys.splice(i, 1); }
    else { this.entries.clear(); this.keys.length = 0; }
  }

  private touch(key: string): void {
    const i = this.keys.indexOf(key);
    if (i !== -1) { this.keys.splice(i, 1); this.keys.push(key); }
  }

  private evictIfNeeded(): void {
    while (this.entries.size >= this.maxEntries) {
      const oldest = this.keys.shift();
      if (oldest) this.entries.delete(oldest);
      else break;
    }
  }
}
