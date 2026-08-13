import { TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import { vi } from 'vitest';
import { VrindayaStoryService } from './vrindaya-story.service';
import { MarketplaceFirebaseService } from '../../features/admin/marketplace/services/marketplace-firebase.service';

vi.mock('firebase/firestore', () => ({
  getDoc: vi.fn(),
  doc: vi.fn(),
}));

import { getDoc } from 'firebase/firestore';

const getDocMock = vi.mocked(getDoc);

function snapshot(data: Record<string, unknown>) {
  return { exists: () => true, data: () => data } as never;
}

function fakeFirebase() {
  return { getFirestore: async () => ({}) };
}

describe('VrindayaStoryService', () => {
  beforeEach(() => {
    getDocMock.mockReset();
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
    getDocMock.mockResolvedValue(snapshot({
      vrindayaStory: {
        items: [
          { storyId: 'story-1', storyNumber: '01', title: 'Rooted in heritage', description: 'd1', imageUrl: 'https://res.cloudinary.com/x/1.jpg', imageAlt: 'a1', imagePosition: 'center', displayOrder: 1, isActive: true },
          { storyId: 'story-2', storyNumber: '02', title: 'Fabrics that breathe', description: 'd2', imageUrl: 'https://res.cloudinary.com/x/2.jpg', imageAlt: 'a2', imagePosition: 'top', displayOrder: 2, isActive: true },
        ],
      },
    }));
    const svc = setup();
    await svc.ensureLoaded();

    expect(svc.loaded()).toBe(true);
    expect(svc.config()?.items.length).toBe(2);
    expect(svc.items().map(i => i.title)).toEqual(['Rooted in heritage', 'Fabrics that breathe']);
    expect(svc.items()[1].imagePosition).toBe('top');
  });

  it('filters out inactive and imageless items and sorts by displayOrder', async () => {
    getDocMock.mockResolvedValue(snapshot({
      vrindayaStory: {
        items: [
          { storyId: 'off', imageUrl: 'https://x/off.jpg', title: 'Off', displayOrder: 1, isActive: false },
          { storyId: 'b', imageUrl: 'https://x/b.jpg', title: 'B', displayOrder: 3, isActive: true },
          { storyId: 'noimg', imageUrl: '', title: 'No image', displayOrder: 2, isActive: true },
          { storyId: 'a', imageUrl: 'https://x/a.jpg', title: 'A', displayOrder: 1, isActive: true },
        ],
      },
    }));
    const svc = setup();
    await svc.ensureLoaded();
    expect(svc.items().map(i => i.storyId)).toEqual(['a', 'b']);
  });

  it('defaults image position to center and story number to the index when missing', async () => {
    getDocMock.mockResolvedValue(snapshot({
      vrindayaStory: {
        items: [
          { storyId: 'story-1', imageUrl: 'https://x/1.jpg', displayOrder: 1, isActive: true },
        ],
      },
    }));
    const svc = setup();
    await svc.ensureLoaded();
    expect(svc.items()[0].imagePosition).toBe('center');
    expect(svc.items()[0].storyNumber).toBe('01');
  });

  it('keeps the fallback (config null) when the document does not exist', async () => {
    getDocMock.mockResolvedValue({ exists: () => false, data: () => ({}) } as never);
    const svc = setup();
    await svc.ensureLoaded();
    expect(svc.config()).toBeNull();
    expect(svc.items().length).toBe(0);
  });

  it('does not touch Firestore during SSR', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        { provide: PLATFORM_ID, useValue: 'server' },
        { provide: MarketplaceFirebaseService, useValue: fakeFirebase() },
      ],
    });
    const svc = TestBed.inject(VrindayaStoryService);
    await svc.ensureLoaded();
    expect(getDocMock).not.toHaveBeenCalled();
  });
});
