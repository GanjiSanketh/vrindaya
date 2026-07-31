import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import type { DocumentReference, Firestore } from 'firebase/firestore';
import { MarketplaceFirebaseService } from '../../features/admin/marketplace/services/marketplace-firebase.service';
import { AuthTokenStorageService } from '../services/auth-token-storage.service';

/** Roles whose browsing must never contribute analytics events (staff/testers). */
const EXCLUDED_ROLES = ['SuperAdmin', 'Admin'];

/** Firestore path segments for the product analytics collection. */
export const ANALYTICS_ROOT = 'analytics';
export const ANALYTICS_PRODUCT_DAILY_SUB = 'daily';

/** Path segments for a product's totals doc and its `YYYY-MM-DD` daily doc. */
export function productAnalyticsPaths(productId: string, dateKey: string): { totals: string[]; daily: string[] } {
  return {
    totals: [ANALYTICS_ROOT, productId],
    daily: [ANALYTICS_ROOT, productId, ANALYTICS_PRODUCT_DAILY_SUB, dateKey],
  };
}

/** Local-time `YYYY-MM-DD` key used for daily analytics documents. */
export function toLocalDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Low-level, metric-agnostic analytics storage.
 *
 * This is the only place the analytics layer touches Firestore. Future
 * analytics domains (search, category, homepage, campaign, conversion) can
 * build document refs for their own collections and call {@link increment}
 * without duplicating the atomic-write, timestamp or role-gating logic.
 */
@Injectable({ providedIn: 'root' })
export class AnalyticsFirestoreService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly firebase = inject(MarketplaceFirebaseService);
  private readonly tokenStorage = inject(AuthTokenStorageService);

  getFirestore(): Promise<Firestore> {
    return this.firebase.getFirestore();
  }

  /**
   * Document refs for a product's totals doc and its `YYYY-MM-DD` daily doc.
   * Path building lives in {@link productAnalyticsPaths} (pure, unit-testable).
   */
  async productRefs(
    db: Firestore,
    productId: string,
    dateKey: string,
  ): Promise<{ totals: DocumentReference; daily: DocumentReference }> {
    const { doc } = await import('firebase/firestore');
    return {
      totals: doc(db, ANALYTICS_ROOT, productId),
      daily: doc(db, ANALYTICS_ROOT, productId, ANALYTICS_PRODUCT_DAILY_SUB, dateKey),
    };
  }

  /**
   * Analytics events are recorded for anonymous visitors and customer users
   * only. Admin / Super Admin sessions (the AppJWT role persisted in the
   * admin session storage) are excluded before any Firestore write happens.
   * Never true during SSR/prerender, so server renders cannot pollute data.
   */
  isEligibleUser(): boolean {
    if (!isPlatformBrowser(this.platformId)) return false;
    const role = this.tokenStorage.getSession()?.user?.role ?? null;
    return role === null || !EXCLUDED_ROLES.includes(role);
  }

  /** Local-time `YYYY-MM-DD` for the current date (daily analytics doc id). */
  todayKey(): string {
    return toLocalDateKey(new Date());
  }

  /**
   * Atomically increments counters on a totals doc and its daily doc.
   *
   * - `writeBatch` → totals and daily update together, never partial.
   * - `FieldValue.increment` → concurrent clients cannot lose updates and
   *   there is no read-modify-write race.
   * - `setDoc` with merge → the document is created on first touch, so no
   *   existence reads are needed.
   * - `seedCreatedAt` additionally stamps `createdAt` (and, on totals,
   *   `updatedAt`) so creation markers are not overwritten on every event.
   *   Pass `true` only for the first event per (browser session, doc pair).
   */
  async increment(
    totalsRef: DocumentReference,
    dailyRef: DocumentReference,
    totalsDelta: Record<string, number>,
    dailyDelta: Record<string, number>,
    seedCreatedAt = false,
  ): Promise<void> {
    const { writeBatch, increment, serverTimestamp } = await import('firebase/firestore');
    const db = await this.getFirestore();
    const batch = writeBatch(db);

    const totals: Record<string, unknown> = {};
    for (const [field, by] of Object.entries(totalsDelta)) totals[field] = increment(by);
    totals['updatedAt'] = serverTimestamp();
    totals['lastClickedAt'] = serverTimestamp();
    if (seedCreatedAt) totals['createdAt'] = serverTimestamp();

    const daily: Record<string, unknown> = {};
    for (const [field, by] of Object.entries(dailyDelta)) daily[field] = increment(by);
    daily['lastClickedAt'] = serverTimestamp();
    if (seedCreatedAt) daily['createdAt'] = serverTimestamp();

    batch.set(totalsRef, totals, { merge: true });
    batch.set(dailyRef, daily, { merge: true });
    await batch.commit();
  }
}
