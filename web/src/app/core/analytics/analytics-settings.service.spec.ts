import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { PLATFORM_ID } from '@angular/core';

import { AnalyticsSettingsService } from './analytics-settings.service';
import { MarketplaceFirebaseService } from '../../features/admin/marketplace/services/marketplace-firebase.service';
import { SAFE_OFF_SETTINGS } from './analytics-settings.model';

const { onSnapshotMock, docMock, getFirestoreMock } = vi.hoisted(() => ({
  onSnapshotMock: vi.fn(),
  docMock: vi.fn((_db: unknown, ...path: string[]) => ({ path: path.join('/') })),
  getFirestoreMock: vi.fn().mockResolvedValue({}),
}));

vi.mock('firebase/firestore', () => ({
  onSnapshot: onSnapshotMock,
  doc: docMock,
}));

type SnapshotShape = { exists: () => boolean; data: () => Record<string, unknown> };

describe('AnalyticsSettingsService', () => {
  let svc: AnalyticsSettingsService;
  let emit: (snapshot: SnapshotShape) => void;
  let emitError: (err: unknown) => void;
  let unsubscribe: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onSnapshotMock.mockReset();
    getFirestoreMock.mockReset().mockResolvedValue({});

    onSnapshotMock.mockImplementation((_ref: unknown, next: (s: SnapshotShape) => void, error?: (e: unknown) => void) => {
      emit = next;
      emitError = error ?? (() => {});
      unsubscribe = vi.fn();
      return unsubscribe;
    });

    TestBed.configureTestingModule({
      providers: [
        AnalyticsSettingsService,
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: MarketplaceFirebaseService, useValue: { getFirestore: getFirestoreMock } },
        { provide: HttpClient, useValue: { get: vi.fn(), put: vi.fn() } },
      ],
    });

    svc = TestBed.inject(AnalyticsSettingsService);
  });

  const flush = () => new Promise<void>(resolve => setTimeout(resolve, 30));

  const snap = (data: Record<string, unknown>): SnapshotShape => ({
    exists: () => true,
    data: () => data,
  });

  it('starts fail-closed before any snapshot arrives', () => {
    expect(svc.settings()).toEqual(SAFE_OFF_SETTINGS);
  });

  it('resolves ensureLoaded() with the persisted snapshot and caches it', async () => {
    const promise = svc.ensureLoaded();
    await flush();
    emit(snap({ trackingEnabled: false, productClicks: false }));
    await expect(promise).resolves.toMatchObject({ trackingEnabled: false, productClicks: false });
    expect(svc.settings().trackingEnabled).toBe(false);
  });

  it('updates the cached settings on later snapshots (admin save from another session)', async () => {
    const promise = svc.ensureLoaded();
    await flush();
    emit(snap({ trackingEnabled: true }));
    await promise;

    emit(snap({ trackingEnabled: false, productClicks: false }));
    expect(svc.settings().trackingEnabled).toBe(false);
    expect(svc.settings().productClicks).toBe(false);

    emit(snap({ trackingEnabled: true, heroClicks: false }));
    expect(svc.settings().trackingEnabled).toBe(true);
    expect(svc.settings().heroClicks).toBe(false);
  });

  it('falls back to fail-closed SAFE_OFF when the snapshot errors', async () => {
    const promise = svc.ensureLoaded();
    await flush();
    emit(snap({ trackingEnabled: false }));
    await promise;

    emitError(new Error('permission-denied'));
    expect(svc.settings()).toEqual(SAFE_OFF_SETTINGS);
  });

  it('does not hang when getFirestore() itself rejects', async () => {
    getFirestoreMock.mockRejectedValue(new Error('init failed'));
    await expect(svc.ensureLoaded()).resolves.toEqual(SAFE_OFF_SETTINGS);
    expect(svc.settings()).toEqual(SAFE_OFF_SETTINGS);
  });
});
