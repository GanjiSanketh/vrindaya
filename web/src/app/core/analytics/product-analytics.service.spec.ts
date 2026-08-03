import { TestBed } from '@angular/core/testing';
import { PLATFORM_ID, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import {
  AnalyticsFirestoreService,
  productAnalyticsPaths,
  toLocalDateKey,
} from './analytics-firestore.service';
import { ProductAnalyticsService } from './product-analytics.service';
import { AnalyticsSettingsService } from './analytics-settings.service';
import {
  AnalyticsSettings,
  DEFAULT_ANALYTICS_SETTINGS,
  SAFE_OFF_SETTINGS,
} from './analytics-settings.model';
import { AuthTokenStorageService } from '../services/auth-token-storage.service';
import { MarketplaceFirebaseService } from '../../features/admin/marketplace/services/marketplace-firebase.service';

function refs(_db: unknown, productId: string, dateKey: string) {
  return {
    totals: { ref: 'totals', productId, dateKey },
    daily: { ref: 'daily', productId, dateKey },
  };
}

describe('productAnalyticsPaths', () => {
  it('points the totals doc at analytics/{productId} (even segment count)', () => {
    expect(productAnalyticsPaths('p1', '2026-07-31').totals).toEqual(['analytics', 'p1']);
  });

  it('points the daily doc at analytics/{productId}/daily/{YYYY-MM-DD}', () => {
    expect(productAnalyticsPaths('p1', '2026-07-31').daily).toEqual([
      'analytics', 'p1', 'daily', '2026-07-31',
    ]);
  });
});

describe('AnalyticsFirestoreService', () => {
  function makeService(getSession: () => unknown, platform: string = 'browser') {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        AnalyticsFirestoreService,
        { provide: PLATFORM_ID, useValue: platform },
        { provide: AuthTokenStorageService, useValue: { getSession } },
        { provide: MarketplaceFirebaseService, useValue: { getFirestore: async () => ({}) } },
      ],
    });
    return TestBed.inject(AnalyticsFirestoreService);
  }

  it('records anonymous visitors', () => {
    expect(makeService(() => null).isEligibleUser()).toBe(true);
  });

  it('records customer users', () => {
    expect(makeService(() => ({ user: { role: 'Customer' } })).isEligibleUser()).toBe(true);
  });

  it('excludes Admin sessions', () => {
    expect(makeService(() => ({ user: { role: 'Admin' } })).isEligibleUser()).toBe(false);
  });

  it('excludes SuperAdmin sessions', () => {
    expect(makeService(() => ({ user: { role: 'SuperAdmin' } })).isEligibleUser()).toBe(false);
  });

  it('never records during SSR / prerender', () => {
    expect(makeService(() => null, 'server').isEligibleUser()).toBe(false);
  });

  it('produces a local YYYY-MM-DD date key', () => {
    const svc = makeService(() => null);
    expect(svc.todayKey()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(svc.todayKey()).toBe(toLocalDateKey(new Date()));
  });

  it('pads month and day in the date key', () => {
    expect(toLocalDateKey(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(toLocalDateKey(new Date(2026, 11, 31))).toBe('2026-12-31');
  });
});

describe('ProductAnalyticsService', () => {
  let productRefs: ReturnType<typeof vi.fn>;
  let increment: ReturnType<typeof vi.fn>;
  let eligible: boolean;
  let settingsSignal: ReturnType<typeof signal<AnalyticsSettings>>;

  beforeEach(() => {
    TestBed.resetTestingModule();
    eligible = true;
    settingsSignal = signal<AnalyticsSettings>({ ...DEFAULT_ANALYTICS_SETTINGS });
    productRefs = vi.fn(refs);
    increment = vi.fn().mockResolvedValue(undefined);
    TestBed.configureTestingModule({
      providers: [
        ProductAnalyticsService,
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: HttpClient, useValue: { post: vi.fn(() => ({ pipe: vi.fn() })) } },
        {
          provide: AnalyticsSettingsService,
          useValue: {
            settings: settingsSignal,
            ensureLoaded: vi.fn().mockResolvedValue(DEFAULT_ANALYTICS_SETTINGS),
          },
        },
        {
          provide: AnalyticsFirestoreService,
          useValue: {
            isEligibleUser: () => eligible,
            getFirestore: async () => ({}),
            todayKey: () => '2026-07-31',
            productRefs,
            increment,
          },
        },
      ],
    });
  });

  const flush = () => new Promise<void>(resolve => setTimeout(resolve, 0));

  it('increments totals + daily for a flipkart click', async () => {
    TestBed.inject(ProductAnalyticsService).recordFlipkartClick('p1');
    await flush();
    expect(increment).toHaveBeenCalledTimes(1);
    const [totals, daily, totalsDelta, dailyDelta, seed] = increment.mock.calls[0] as unknown[];
    expect(totals).toEqual({ ref: 'totals', productId: 'p1', dateKey: '2026-07-31' });
    expect(daily).toEqual({ ref: 'daily', productId: 'p1', dateKey: '2026-07-31' });
    expect(totalsDelta).toEqual({ totalFlipkartClicks: 1 });
    expect(dailyDelta).toEqual({ flipkartClicks: 1 });
    expect(seed).toBe(true);
  });

  it('increments totals + daily for a detail click', async () => {
    TestBed.inject(ProductAnalyticsService).recordDetailClick('p1');
    await flush();
    expect(increment.mock.calls[0][2]).toEqual({ totalDetailClicks: 1 });
    expect(increment.mock.calls[0][3]).toEqual({ detailClicks: 1 });
  });

  it('maps the prepared wishlist metric fields', async () => {
    TestBed.inject(ProductAnalyticsService).recordWishlistClick('p1');
    await flush();
    expect(increment.mock.calls[0][2]).toEqual({ totalWishlistClicks: 1 });
    expect(increment.mock.calls[0][3]).toEqual({ wishlistClicks: 1 });
  });

  it('seeds createdAt only on the first event per product', async () => {
    const svc = TestBed.inject(ProductAnalyticsService);
    svc.recordFlipkartClick('p1');
    svc.recordFlipkartClick('p1');
    svc.recordFlipkartClick('p2');
    await flush();
    expect(productRefs).toHaveBeenCalledTimes(3);
    expect(increment).toHaveBeenCalledTimes(3);
    expect(increment.mock.calls[0][4]).toBe(true);
    expect(increment.mock.calls[1][4]).toBe(false);
    expect(increment.mock.calls[2][4]).toBe(true);
  });

  it('skips every event when the user is excluded (Admin / SuperAdmin)', async () => {
    eligible = false;
    const svc = TestBed.inject(ProductAnalyticsService);
    svc.recordDetailClick('p1');
    svc.recordFlipkartClick('p1');
    await flush();
    expect(productRefs).not.toHaveBeenCalled();
    expect(increment).not.toHaveBeenCalled();
  });

  it('refuses to increment when the global tracking switch is OFF', async () => {
    settingsSignal.set({ ...SAFE_OFF_SETTINGS });
    const svc = TestBed.inject(ProductAnalyticsService);
    svc.recordDetailClick('p1');
    svc.recordFlipkartClick('p1');
    await flush();
    expect(productRefs).not.toHaveBeenCalled();
    expect(increment).not.toHaveBeenCalled();
  });

  it('refuses to increment when the productClicks switch is OFF', async () => {
    settingsSignal.set({ ...DEFAULT_ANALYTICS_SETTINGS, trackingEnabled: true, productClicks: false });
    const svc = TestBed.inject(ProductAnalyticsService);
    svc.recordDetailClick('p1');
    svc.recordFlipkartClick('p1');
    await flush();
    expect(productRefs).not.toHaveBeenCalled();
    expect(increment).not.toHaveBeenCalled();
  });

  it('still increments when tracking is enabled', async () => {
    settingsSignal.set({ ...DEFAULT_ANALYTICS_SETTINGS, trackingEnabled: true, productClicks: true });
    const svc = TestBed.inject(ProductAnalyticsService);
    svc.recordDetailClick('p1');
    await flush();
    expect(increment).toHaveBeenCalledTimes(1);
  });
});
