import { TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import { vi } from 'vitest';
import { VrindayaStoryService } from './vrindaya-story.service';
import { MarketplaceFirebaseService } from '../../features/admin/marketplace/services/marketplace-firebase.service';

vi.mock('firebase/firestore', () => ({
  onSnapshot: vi.fn(),
  doc: vi.fn(),
}));

import { onSnapshot } from 'firebase/firestore';

const onSnapshotMock = vi.mocked(onSnapshot);

function snapshot(data: Record<string, unknown>) {
  return { exists: () => true, data: () => data } as never;
}

function missingDocSnapshot() {
  return { exists: () => false, data: () => ({}) } as never;
}

/** The next/error listeners of the most recently registered onSnapshot call. */
function listeners() {
  const call = onSnapshotMock.mock.calls[onSnapshotMock.mock.calls.length - 1];
  return {
    next: call[1] as (snap: unknown) => void,
    error: call[2] as (err: unknown) => void,
  };
}

/** Waits until the service has registered its onSnapshot subscription (getFirestore + dynamic import settled). */
async function waitForSubscription(): Promise<void> {
  await vi.waitFor(() => {
    expect(onSnapshotMock).toHaveBeenCalled();
  });
}

function fakeFirebase(getFirestoreImpl?: () => Promise<unknown>) {
  return { getFirestore: getFirestoreImpl ?? (async () => ({})) };
}

describe('VrindayaStoryService', () => {
  beforeEach(() => {
    onSnapshotMock.mockReset();
    onSnapshotMock.mockImplementation(() => () => {});
  });

  function setup() {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: MarketplaceFirebaseService, useValue: fakeFirebase() },
      ],
    });
    return TestBed.inject(VrindayaStoryService);
  }

  it('parses the nested vrindayaStory from homepageConfig/active', async () => {
    const svc = setup();
    const loaded = svc.ensureLoaded();
    await waitForSubscription();
    listeners().next(snapshot({
      vrindayaStory: {
        items: [
          { storyId: 'story-1', storyNumber: '01', title: 'Rooted in heritage', description: 'd1', imageUrl: 'https://res.cloudinary.com/x/1.jpg', imageAlt: 'a1', imagePosition: 'center', displayOrder: 1, isActive: true },
          { storyId: 'story-2', storyNumber: '02', title: 'Fabrics that breathe', description: 'd2', imageUrl: 'https://res.cloudinary.com/x/2.jpg', imageAlt: 'a2', imagePosition: 'top', displayOrder: 2, isActive: true },
        ],
      },
    }));
    await loaded;

    expect(svc.loaded()).toBe(true);
    expect(svc.config()?.items.length).toBe(2);
    expect(svc.items().map(i => i.title)).toEqual(['Rooted in heritage', 'Fabrics that breathe']);
    expect(svc.items()[1].imagePosition).toBe('top');
  });

  it('filters out inactive and imageless items and sorts by displayOrder', async () => {
    const svc = setup();
    const loaded = svc.ensureLoaded();
    await waitForSubscription();
    listeners().next(snapshot({
      vrindayaStory: {
        items: [
          { storyId: 'off', imageUrl: 'https://x/off.jpg', title: 'Off', displayOrder: 1, isActive: false },
          { storyId: 'b', imageUrl: 'https://x/b.jpg', title: 'B', displayOrder: 3, isActive: true },
          { storyId: 'noimg', imageUrl: '', title: 'No image', displayOrder: 2, isActive: true },
          { storyId: 'a', imageUrl: 'https://x/a.jpg', title: 'A', displayOrder: 1, isActive: true },
        ],
      },
    }));
    await loaded;
    expect(svc.items().map(i => i.storyId)).toEqual(['a', 'b']);
  });

  it('defaults image position to center and story number to the index when missing', async () => {
    const svc = setup();
    const loaded = svc.ensureLoaded();
    await waitForSubscription();
    listeners().next(snapshot({
      vrindayaStory: {
        items: [
          { storyId: 'story-1', imageUrl: 'https://x/1.jpg', displayOrder: 1, isActive: true },
        ],
      },
    }));
    await loaded;
    expect(svc.items()[0].imagePosition).toBe('center');
    expect(svc.items()[0].storyNumber).toBe('01');
  });

  it('keeps the fallback (config null) when the document does not exist', async () => {
    const svc = setup();
    const loaded = svc.ensureLoaded();
    await waitForSubscription();
    listeners().next(missingDocSnapshot());
    await loaded;
    expect(svc.config()).toBeNull();
    expect(svc.items().length).toBe(0);
    expect(svc.loaded()).toBe(true);
  });

  it('only opens one subscription per session', async () => {
    const svc = setup();
    const first = svc.ensureLoaded();
    await waitForSubscription();
    listeners().next(snapshot({ vrindayaStory: { items: [] } }));
    await first;

    await svc.ensureLoaded();
    await svc.ensureLoaded();
    expect(onSnapshotMock).toHaveBeenCalledTimes(1);
  });

  it('does not touch Firestore during SSR', async () => {
    const getFirestore = vi.fn(async () => ({}));
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        { provide: PLATFORM_ID, useValue: 'server' },
        { provide: MarketplaceFirebaseService, useValue: { getFirestore } },
      ],
    });
    const svc = TestBed.inject(VrindayaStoryService);
    await svc.ensureLoaded();
    expect(getFirestore).not.toHaveBeenCalled();
    expect(onSnapshotMock).not.toHaveBeenCalled();
  });

  it('self-heals after a transient snapshot error — the live subscription recovers without a reload', async () => {
    const svc = setup();
    const loaded = svc.ensureLoaded();
    await waitForSubscription();

    // A transient read failure surfaces an error but never pins the section.
    listeners().error(new Error('network blip'));
    await loaded;
    expect(svc.loaded()).toBe(true);
    expect(svc.error()).toBe('Unable to load the Vrindaya Story configuration.');
    expect(svc.config()).toBeNull();

    // The SDK keeps the subscription alive; the next snapshot rewrites the cache.
    listeners().next(snapshot({
      vrindayaStory: {
        items: [
          { storyId: 'story-1', title: 'Recovered', imageUrl: 'https://res.cloudinary.com/x/rec.jpg', displayOrder: 1, isActive: true },
        ],
      },
    }));
    await Promise.resolve();
    expect(svc.config()?.items[0].title).toBe('Recovered');
    expect(svc.error()).toBeNull();
  });

  it('forgets a failed getFirestore() init so a later visit retries and recovers', async () => {
    let calls = 0;
    const getFirestore = vi.fn(async () => {
      calls += 1;
      if (calls === 1) throw new Error('lazy firebase chunk failed');
      return {};
    });
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: MarketplaceFirebaseService, useValue: { getFirestore } },
      ],
    });
    const svc = TestBed.inject(VrindayaStoryService);

    // First visit: the init fails — the section stays on defaults, error surfaced.
    await svc.ensureLoaded();
    expect(getFirestore).toHaveBeenCalledTimes(1);
    expect(svc.loaded()).toBe(true);
    expect(svc.error()).toBe('Unable to load the Vrindaya Story configuration.');
    expect(svc.config()).toBeNull();

    // The failed attempt is forgotten — a later visit retries the subscription.
    const retried = svc.ensureLoaded();
    await waitForSubscription();
    expect(getFirestore).toHaveBeenCalledTimes(2);
    listeners().next(snapshot({
      vrindayaStory: {
        items: [
          { storyId: 'story-1', title: 'Recovered', imageUrl: 'https://res.cloudinary.com/x/rec.jpg', displayOrder: 1, isActive: true },
        ],
      },
    }));
    await retried;
    expect(svc.config()?.items[0].title).toBe('Recovered');
    expect(svc.error()).toBeNull();
  });

  it('rewrites the cache when the admin publishes a new snapshot later (live updates)', async () => {
    const svc = setup();
    const loaded = svc.ensureLoaded();
    await waitForSubscription();
    listeners().next(snapshot({
      vrindayaStory: {
        items: [
          { storyId: 'story-1', title: 'Before', imageUrl: 'https://res.cloudinary.com/x/a.jpg', displayOrder: 1, isActive: true },
        ],
      },
    }));
    await loaded;
    expect(svc.items()[0].title).toBe('Before');

    listeners().next(snapshot({
      vrindayaStory: {
        items: [
          { storyId: 'story-1', title: 'After', imageUrl: 'https://res.cloudinary.com/x/b.jpg', displayOrder: 1, isActive: true },
        ],
      },
    }));
    await Promise.resolve();
    expect(svc.items()[0].title).toBe('After');
    expect(svc.loaded()).toBe(true);
  });
});
