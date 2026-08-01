import { TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideLocationMocks } from '@angular/common/testing';
import { vi } from 'vitest';
import { HeroShowcaseManagementComponent } from './hero-showcase-management.component';
import { HeroShowcaseAdminService } from '../../services/hero-showcase-admin.service';
import { HeroShowcase, HeroShowcaseItem, HeroShowcaseSavePayload } from '../../../../core/models/hero-showcase.model';

function item(id: string, overrides: Partial<HeroShowcaseItem> = {}): HeroShowcaseItem {
  return {
    itemId: id, imageUrl: '', storagePath: '', title: `Title ${id}`, subtitle: '',
    buttonText: 'Shop Now', buttonLink: '/shop', displayOrder: 1, enabled: true,
    createdAt: '', updatedAt: '', ...overrides,
  };
}

function makeShowcaseAdmin() {
  return {
    getConfig: vi.fn(async (): Promise<HeroShowcase | null> => null),
    save: vi.fn(async (payload: HeroShowcaseSavePayload): Promise<HeroShowcase> => ({
      ...payload,
      createdAt: '',
      updatedAt: '',
      updatedBy: 'admin',
      items: payload.items.map(it => ({ ...it, createdAt: '', updatedAt: '' })),
    }) as HeroShowcase),
    uploadImage: vi.fn(),
    deleteImage: vi.fn(async () => undefined),
  };
}

describe('HeroShowcaseManagementComponent', () => {
  function setup(config: HeroShowcase | null = null) {
    const showcaseAdmin = makeShowcaseAdmin();
    showcaseAdmin.getConfig.mockResolvedValue(config);

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [HeroShowcaseManagementComponent],
      providers: [
        { provide: PLATFORM_ID, useValue: 'server' },
        { provide: HeroShowcaseAdminService, useValue: showcaseAdmin },
        provideRouter([]),
        provideLocationMocks(),
      ],
    });

    const fixture = TestBed.createComponent(HeroShowcaseManagementComponent);
    return { fixture, showcaseAdmin, el: fixture.nativeElement as HTMLElement };
  }

  /** Renders the component and settles the async getConfig load. */
  async function render(config: HeroShowcase | null = null) {
    const ctx = setup(config);
    ctx.fixture.detectChanges();
    await ctx.fixture.whenStable();
    ctx.fixture.detectChanges();
    return ctx;
  }

  it('renders the Hero Showcase management screen as a single form', async () => {
    const { el } = await render();
    expect(el.querySelector('.hsc-heading')?.textContent?.trim()).toBe('Hero Showcase');
    expect(el.querySelector('form.hsc-form')).not.toBeNull();
    expect(el.querySelector('input[type="checkbox"]')).not.toBeNull();
  });

  it('loads an existing configuration and renders its slides', async () => {
    const cfg: HeroShowcase = {
      enabled: true, autoplay: true, pauseOnHover: true, rotationIntervalSeconds: 8, transition: 'fade',
      items: [item('i1', { displayOrder: 1 }), item('i2', { displayOrder: 2 })],
      createdAt: '', updatedAt: '', updatedBy: 'admin',
    };
    const { el } = await render(cfg);
    expect(el.querySelectorAll('.hsc-slide-card').length).toBe(2);
    expect(el.querySelector('.hsc-count')?.textContent?.trim()).toBe('2 / 10');
    expect([...el.querySelectorAll('.hsc-slide-name')].map(n => n.textContent?.trim()))
      .toEqual(['Slide #1', 'Slide #2']);
  });

  it('adds a slide with the next display order', async () => {
    const { fixture, el } = await render();

    (el.querySelector('.hsc-btn--primary') as HTMLButtonElement).click();
    fixture.detectChanges();
    (el.querySelector('.hsc-btn--primary') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect([...el.querySelectorAll('.hsc-slide-name')].map(n => n.textContent?.trim()))
      .toEqual(['Slide #1', 'Slide #2']);
    expect(el.querySelector('.hsc-count')?.textContent?.trim()).toBe('2 / 10');
  });

  it('enforces the 10-item maximum', async () => {
    const cfg: HeroShowcase = {
      enabled: true, autoplay: false, pauseOnHover: false, rotationIntervalSeconds: 8, transition: 'fade',
      items: Array.from({ length: 10 }, (_, i) => item(`i${i}`, { displayOrder: i + 1 })),
      createdAt: '', updatedAt: '', updatedBy: 'admin',
    };
    const { el } = await render(cfg);

    const addBtn = el.querySelector('.hsc-btn--primary') as HTMLButtonElement;
    expect(addBtn.disabled).toBe(true);
    addBtn.click();
    expect(el.querySelectorAll('.hsc-slide-card').length).toBe(10);
  });

  it('removes a slide and reindexes display order', async () => {
    const cfg: HeroShowcase = {
      enabled: true, autoplay: false, pauseOnHover: false, rotationIntervalSeconds: 8, transition: 'fade',
      items: [item('a', { displayOrder: 1 }), item('b', { displayOrder: 2 }), item('c', { displayOrder: 3 })],
      createdAt: '', updatedAt: '', updatedBy: 'admin',
    };
    const { fixture, el } = await render(cfg);

    const deleteButtons = el.querySelectorAll('.hsc-icon-btn--danger');
    (deleteButtons[0] as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(el.querySelectorAll('.hsc-slide-card').length).toBe(2);
    expect([...el.querySelectorAll('.hsc-slide-name')].map(n => n.textContent?.trim()))
      .toEqual(['Slide #1', 'Slide #2']);
  });

  it('tracks unsaved changes and clears them after a single save', async () => {
    const { fixture, el, showcaseAdmin } = await render();

    expect(el.querySelector('.hsc-unsaved')).toBeNull();

    (el.querySelector('.hsc-btn--primary') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(el.querySelector('.hsc-unsaved')?.textContent?.trim()).toBe('Unsaved Changes');

    (el.querySelector('.hsc-btn--save') as HTMLButtonElement).click();
    await Promise.resolve();
    fixture.detectChanges();

    expect(showcaseAdmin.save).toHaveBeenCalledTimes(1);
    expect(el.querySelector('.hsc-unsaved')).toBeNull();
    expect(el.querySelector('.hsc-saved')?.textContent?.trim()).toBe('All Changes Saved');
  });

  it('saves the configuration with sequential display orders in one payload', async () => {
    const { el, showcaseAdmin } = await render();

    (el.querySelector('.hsc-btn--primary') as HTMLButtonElement).click();
    (el.querySelector('.hsc-btn--save') as HTMLButtonElement).click();
    await Promise.resolve();

    expect(showcaseAdmin.save).toHaveBeenCalledTimes(1);
    const payload = showcaseAdmin.save.mock.calls[0][0] as {
      enabled: boolean;
      transition: string;
      items: { displayOrder: number }[];
    };
    expect(payload.items).toHaveLength(1);
    expect(payload.items[0].displayOrder).toBe(1);
    expect(payload.enabled).toBe(false);
    expect(payload.transition).toBe('fade');
  });

  it('shows an error when saving with no slides', async () => {
    const { fixture, el, showcaseAdmin } = await render();

    (el.querySelector('.hsc-btn--save') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(showcaseAdmin.save).not.toHaveBeenCalled();
    expect(el.querySelector('.hsc-banner--error')).not.toBeNull();
  });

  it('links to the separate fallback Hero Banner page', async () => {
    const { el } = await render();
    const link = el.querySelector('a[routerlink="/admin/hero-banners"]');
    expect(link).not.toBeNull();
  });
});
