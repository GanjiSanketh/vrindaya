import { TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import { vi } from 'vitest';
import { HeroShowcaseService } from './hero-showcase.service';
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

describe('HeroShowcaseService', () => {
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
    return TestBed.inject(HeroShowcaseService);
  }

  it('parses the nested heroShowcase from homepageConfig/active', async () => {
    getDocMock.mockResolvedValue(snapshot({
      heroShowcase: {
        enabled: true,
        autoplay: true,
        pauseOnHover: true,
        rotationIntervalSeconds: 6,
        transition: 'fade',
        items: [
          { itemId: 'i1', imageUrl: 'https://res.cloudinary.com/x/i1.jpg', storagePath: 'hero-showcase/items/i1', title: 'First', subtitle: 's', buttonText: 'Shop', buttonLink: '/shop', displayOrder: 1, enabled: true },
          { itemId: 'i2', imageUrl: 'https://res.cloudinary.com/x/i2.jpg', storagePath: 'hero-showcase/items/i2', title: 'Second', subtitle: 's2', buttonText: 'Shop', buttonLink: '/category/kurtas', displayOrder: 2, enabled: true },
        ],
      },
    }));
    const svc = setup();
    await svc.ensureLoaded();

    expect(svc.loaded()).toBe(true);
    expect(svc.config()?.enabled).toBe(true);
    expect(svc.config()?.rotationIntervalSeconds).toBe(6);
    expect(svc.enabled()).toBe(true);
    expect(svc.items().map(i => i.title)).toEqual(['First', 'Second']);
  });

  it('reports disabled when enabled is false', async () => {
    getDocMock.mockResolvedValue(snapshot({ heroShowcase: { enabled: false, items: [] } }));
    const svc = setup();
    await svc.ensureLoaded();
    expect(svc.enabled()).toBe(false);
    expect(svc.items().length).toBe(0);
  });

  it('filters out disabled and imageless items and sorts by displayOrder', async () => {
    getDocMock.mockResolvedValue(snapshot({
      heroShowcase: {
        enabled: true,
        items: [
          { itemId: 'off', imageUrl: 'https://x/off.jpg', title: 'Off', displayOrder: 1, enabled: false },
          { itemId: 'b', imageUrl: 'https://x/b.jpg', title: 'B', displayOrder: 3, enabled: true },
          { itemId: 'noimg', imageUrl: '', title: 'No image', displayOrder: 2, enabled: true },
          { itemId: 'a', imageUrl: 'https://x/a.jpg', title: 'A', displayOrder: 1, enabled: true },
        ],
      },
    }));
    const svc = setup();
    await svc.ensureLoaded();
    expect(svc.items().map(i => i.itemId)).toEqual(['a', 'b']);
  });

  it('defaults the interval to 8 and the transition to fade when missing', async () => {
    getDocMock.mockResolvedValue(snapshot({ heroShowcase: { enabled: true, items: [] } }));
    const svc = setup();
    await svc.ensureLoaded();
    expect(svc.config()?.rotationIntervalSeconds).toBe(8);
    expect(svc.config()?.transition).toBe('fade');
  });

  it('keeps the fallback (config null) when the document does not exist', async () => {
    getDocMock.mockResolvedValue({ exists: () => false, data: () => ({}) } as never);
    const svc = setup();
    await svc.ensureLoaded();
    expect(svc.config()).toBeNull();
    expect(svc.enabled()).toBe(false);
  });

  it('does not touch Firestore during SSR', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        { provide: PLATFORM_ID, useValue: 'server' },
        { provide: MarketplaceFirebaseService, useValue: fakeFirebase() },
      ],
    });
    const svc = TestBed.inject(HeroShowcaseService);
    await svc.ensureLoaded();
    expect(getDocMock).not.toHaveBeenCalled();
  });
});
