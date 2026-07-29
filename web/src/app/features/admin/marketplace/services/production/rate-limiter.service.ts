import { Injectable } from '@angular/core';
import type { RateLimitEntry } from './production.models';
import { DEFAULT_RATE_LIMIT_CONFIG } from './production.models';

@Injectable({ providedIn: 'root' })
export class RateLimiterService {
  private readonly entries = new Map<string, RateLimitEntry>();

  private readonly limits = new Map<string, { maxRequests: number; windowMs: number }>();

  setLimit(key: string, maxRequests: number, windowMs: number): void {
    this.limits.set(key, { maxRequests, windowMs });
  }

  check(key: string): { allowed: boolean; remaining: number; resetInMs: number } {
    const config = this.limits.get(key) ?? DEFAULT_RATE_LIMIT_CONFIG;
    const now = Date.now();
    let entry = this.entries.get(key);

    if (!entry || (now - entry.windowStart) >= entry.windowMs) {
      entry = { key, count: 0, windowStart: now, limit: config.maxRequests, windowMs: config.windowMs };
      this.entries.set(key, entry);
    }

    const elapsed = now - entry.windowStart;
    const resetInMs = Math.max(0, entry.windowMs - elapsed);

    if (entry.count >= entry.limit) {
      return { allowed: false, remaining: 0, resetInMs };
    }

    entry.count++;
    return { allowed: true, remaining: entry.limit - entry.count, resetInMs };
  }

  async acquire(key: string): Promise<boolean> {
    const result = this.check(key);
    return result.allowed;
  }

  reset(key: string): void {
    this.entries.delete(key);
  }

  resetAll(): void {
    this.entries.clear();
  }
}
