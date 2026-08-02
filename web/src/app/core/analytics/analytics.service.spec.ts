import { TestBed } from '@angular/core/testing';
import { PLATFORM_ID, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';

import { AnalyticsService } from './analytics.service';
import { AnalyticsSettingsService } from './analytics-settings.service';
import { AnalyticsFirestoreService } from './analytics-firestore.service';
import { ProductAnalyticsService } from './product-analytics.service';
import { DEFAULT_ANALYTICS_SETTINGS, AnalyticsSettings } from './analytics-settings.model';

const { setDocMock, docMock, incrementFnMock, serverTimestampMock } = vi.hoisted(() => ({
  setDocMock: vi.fn().mockResolvedValue(undefined),
  docMock: vi.fn((_db: unknown, ...path: string[]) => ({ path: path.join('/') })),
  incrementFnMock: vi.fn((n: number) => ({ __increment: n })),
  serverTimestampMock: vi.fn(() => ({ __serverTimestamp: true })),
}));

vi.mock('firebase/firestore', () => ({
  doc: docMock,
  setDoc: setDocMock,
  increment: incrementFnMock,
  serverTimestamp: serverTimestampMock,
}));

describe('AnalyticsService', () => {
  let settings: ReturnType<typeof signal<AnalyticsSettings>>;
  let storeIncrement: ReturnType<typeof vi.fn>;
  let eligible: boolean;
  let svc: AnalyticsService;
  let productAnalytics: ProductAnalyticsService;

  function build(nextSettings: AnalyticsSettings): void {
    TestBed.resetTestingModule();
    settings = signal(nextSettings);
    eligible = true;
    storeIncrement = vi.fn().mockResolvedValue(undefined);
    setDocMock.mockClear();
    docMock.mockClear();

    TestBed.configureTestingModule({
      providers: [
        AnalyticsService,
        { provide: PLATFORM_ID, useValue: 'server' },
        {
          provide: AnalyticsSettingsService,
          useValue: {
            settings,
            ensureLoaded: vi.fn().mockResolvedValue(DEFAULT_ANALYTICS_SETTINGS),
          },
        },
        {
          provide: AnalyticsFirestoreService,
          useValue: {
            isEligibleUser: () => eligible,
            getFirestore: async () => ({}),
            todayKey: () => '2026-08-02',
            increment: storeIncrement,
          },
        },
        {
          provide: ProductAnalyticsService,
          useValue: {
            recordClick: vi.fn(),
            recordDetailClick: vi.fn(),
            recordFlipkartClick: vi.fn(),
            recordWishlistClick: vi.fn(),
            recordCartClick: vi.fn(),
            recordPurchase: vi.fn(),
          },
        },
        { provide: Router, useValue: { events: new Subject() } },
      ],
    });

    svc = TestBed.inject(AnalyticsService);
    productAnalytics = TestBed.inject(ProductAnalyticsService);
  }

  const flush = () => new Promise<void>(resolve => setTimeout(resolve, 30));

  const on = (overrides: Partial<AnalyticsSettings> = {}): AnalyticsSettings =>
    ({ ...DEFAULT_ANALYTICS_SETTINGS, ...overrides });

  it('records a product card click only when productClicks is on', async () => {
    build(on({ trackingEnabled: true, productClicks: false }));
    svc.trackProductClick('p1');
    await flush();
    expect(productAnalytics.recordFlipkartClick).not.toHaveBeenCalled();

    settings.set(on({ trackingEnabled: true, productClicks: true }));
    svc.trackProductClick('p1');
    await flush();
    expect(productAnalytics.recordFlipkartClick).toHaveBeenCalledWith('p1');
  });

  it('records nothing when global tracking is disabled', async () => {
    build(on({ trackingEnabled: false, productClicks: true }));
    svc.trackProductClick('p1');
    svc.trackProductView('p1');
    svc.trackWishlist('p1');
    svc.trackHeroClick();
    svc.trackCategoryClick('c1');
    svc.trackSearch('krishna');
    await flush();
    expect(productAnalytics.recordFlipkartClick).not.toHaveBeenCalled();
    expect(productAnalytics.recordDetailClick).not.toHaveBeenCalled();
    expect(productAnalytics.recordWishlistClick).not.toHaveBeenCalled();
    expect(storeIncrement).not.toHaveBeenCalled();
    expect(setDocMock).not.toHaveBeenCalled();
  });

  it('gates wishlist events on wishlistTracking', async () => {
    build(on({ trackingEnabled: true, wishlistTracking: false }));
    svc.trackWishlist('p1');
    await flush();
    expect(productAnalytics.recordWishlistClick).not.toHaveBeenCalled();

    settings.set(on({ trackingEnabled: true, wishlistTracking: true }));
    svc.trackWishlist('p1');
    await flush();
    expect(productAnalytics.recordWishlistClick).toHaveBeenCalledWith('p1');
  });

  it('gates site counters on their per-event switch', async () => {
    build(on({ trackingEnabled: true, heroClicks: false }));
    svc.trackHeroClick();
    await flush();
    expect(storeIncrement).not.toHaveBeenCalled();

    settings.set(on({ trackingEnabled: true, heroClicks: true }));
    svc.trackHeroClick();
    await flush();
    expect(storeIncrement).toHaveBeenCalledTimes(1);
    expect(storeIncrement.mock.calls[0][2]).toEqual({ heroClicks: 1 });
  });

  it('records nav clicks under global tracking only', async () => {
    build(on({ trackingEnabled: false }));
    svc.trackNavClick('Home');
    await flush();
    expect(storeIncrement).not.toHaveBeenCalled();

    settings.set(on({ trackingEnabled: true }));
    svc.trackNavClick('Home');
    await flush();
    expect(storeIncrement.mock.calls[0][2]).toEqual({ navClicks: 1 });
  });

  it('commits a search only when searchTracking is on', async () => {
    build(on({ trackingEnabled: true, searchTracking: false }));
    svc.trackSearch('  krishna  ');
    await flush();
    expect(setDocMock).not.toHaveBeenCalled();

    settings.set(on({ trackingEnabled: true, searchTracking: true }));
    svc.trackSearch('  krishna  ');
    await flush();
    expect(setDocMock).toHaveBeenCalledTimes(1);
    const [ref, data] = setDocMock.mock.calls[0] as unknown[];
    expect((ref as { path: string }).path).toContain('siteAnalytics/searches');
    expect(data).toMatchObject({ query: 'krishna' });
  });

  it('skips site events and searches for excluded users (Admin / SuperAdmin)', async () => {
    build(on({ trackingEnabled: true, searchTracking: true, heroClicks: true }));
    eligible = false;
    svc.trackHeroClick();
    svc.trackSearch('krishna');
    await flush();
    expect(storeIncrement).not.toHaveBeenCalled();
    expect(setDocMock).not.toHaveBeenCalled();
  });

  it('seeds createdAt only on the first site event', async () => {
    build(on({ trackingEnabled: true, heroClicks: true }));
    svc.trackHeroClick();
    await flush();
    svc.trackHeroClick();
    await flush();
    expect(storeIncrement).toHaveBeenCalledTimes(2);
    expect(storeIncrement.mock.calls[0][4]).toBe(true);
    expect(storeIncrement.mock.calls[1][4]).toBe(false);
  });
});
