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
    itemId: id, imageUrl: '', storagePath: '', mobileImageUrl: '', mobileStoragePath: '',
    imagePosition: 'center', title: `Title ${id}`, subtitle: '', buttonText: 'Shop Now',
    buttonLink: '/shop', displayOrder: 1, enabled: true, createdAt: '', updatedAt: '', ...overrides,
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

  /** Clicks the Add Hero Slide button and closes the editor modal that opens. */
  function addSlideViaButton(el: HTMLElement, fixture: { detectChanges(): void }): void {
    (el.querySelector('.hsc-btn--primary') as HTMLButtonElement).click();
    fixture.detectChanges();
    (el.querySelector('.hsc-editor-close') as HTMLButtonElement).click();
    fixture.detectChanges();
  }

  it('renders the Hero Showcase management screen as a single form', async () => {
    const { el } = await render();
    expect(el.querySelector('.hsc-heading')?.textContent?.trim()).toBe('Hero Showcase');
    expect(el.querySelector('form.hsc-form')).not.toBeNull();
    expect(el.querySelector('input[type="checkbox"]')).not.toBeNull();
    expect(el.querySelector('.hsc-savebar')).not.toBeNull();
  });

  it('loads an existing configuration and renders its slide rows', async () => {
    const cfg: HeroShowcase = {
      enabled: true, autoplay: true, pauseOnHover: true, rotationIntervalSeconds: 8, transition: 'fade',
      items: [item('i1', { displayOrder: 1 }), item('i2', { displayOrder: 2 })],
      createdAt: '', updatedAt: '', updatedBy: 'admin',
    };
    const { el } = await render(cfg);
    expect(el.querySelectorAll('.hsc-slide-row').length).toBe(2);
    expect(el.querySelector('.hsc-slide-count')?.textContent?.trim()).toBe('2 of 10 slides');
    expect([...el.querySelectorAll('.hsc-slide-num')].map(n => n.textContent?.trim()))
      .toEqual(['Slide #1', 'Slide #2']);
    expect([...el.querySelectorAll('.hsc-slide-title')].map(n => n.textContent?.trim()))
      .toEqual(['Title i1', 'Title i2']);
  });

  it('shows a Live status for enabled slides and Hidden for disabled ones', async () => {
    const cfg: HeroShowcase = {
      enabled: true, autoplay: false, pauseOnHover: false, rotationIntervalSeconds: 8, transition: 'fade',
      items: [item('a', { displayOrder: 1, enabled: true }), item('b', { displayOrder: 2, enabled: false })],
      createdAt: '', updatedAt: '', updatedBy: 'admin',
    };
    const { el } = await render(cfg);
    const statuses = [...el.querySelectorAll('.hsc-status')].map(s => s.textContent?.trim());
    expect(statuses).toEqual(['Live', 'Hidden']);
  });

  it('adds a slide via the editor and gives it the next display order', async () => {
    const { fixture, el } = await render();

    addSlideViaButton(el, fixture);
    addSlideViaButton(el, fixture);

    expect(el.querySelectorAll('.hsc-slide-row').length).toBe(2);
    expect([...el.querySelectorAll('.hsc-slide-num')].map(n => n.textContent?.trim()))
      .toEqual(['Slide #1', 'Slide #2']);
    expect(el.querySelector('.hsc-slide-count')?.textContent?.trim()).toBe('2 of 10 slides');
  });

  it('opens the slide editor modal when a slide is added', async () => {
    const { fixture, el } = await render();

    (el.querySelector('.hsc-btn--primary') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(el.querySelector('.hsc-editor')).not.toBeNull();
    expect(el.querySelector('.hsc-editor-title')?.textContent?.trim()).toBe('Create Hero Slide');
    expect(el.querySelector('.hsc-dropzone')).not.toBeNull();
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
    expect(el.querySelectorAll('.hsc-slide-row').length).toBe(10);
  });

  it('deletes a slide only after confirmation and reindexes display order', async () => {
    const cfg: HeroShowcase = {
      enabled: true, autoplay: false, pauseOnHover: false, rotationIntervalSeconds: 8, transition: 'fade',
      items: [item('a', { displayOrder: 1 }), item('b', { displayOrder: 2 }), item('c', { displayOrder: 3 })],
      createdAt: '', updatedAt: '', updatedBy: 'admin',
    };
    const { fixture, el } = await render(cfg);

    // Open the row's ⋯ menu and pick Delete — a confirmation dialog appears.
    (el.querySelectorAll('.hsc-menu-wrap .hsc-icon-btn')[0] as HTMLButtonElement).click();
    fixture.detectChanges();
    (el.querySelector('.hsc-menu-danger') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(el.querySelector('.hsc-confirm')).not.toBeNull();
    expect(el.querySelectorAll('.hsc-slide-row').length).toBe(3);

    // Confirm the deletion.
    (el.querySelector('.hsc-confirm-actions .hsc-btn--danger') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(el.querySelector('.hsc-confirm')).toBeNull();
    expect(el.querySelectorAll('.hsc-slide-row').length).toBe(2);
    expect([...el.querySelectorAll('.hsc-slide-num')].map(n => n.textContent?.trim()))
      .toEqual(['Slide #1', 'Slide #2']);
  });

  it('cancelling the delete confirmation keeps the slide', async () => {
    const cfg: HeroShowcase = {
      enabled: true, autoplay: false, pauseOnHover: false, rotationIntervalSeconds: 8, transition: 'fade',
      items: [item('a', { displayOrder: 1 }), item('b', { displayOrder: 2 })],
      createdAt: '', updatedAt: '', updatedBy: 'admin',
    };
    const { fixture, el } = await render(cfg);

    (el.querySelectorAll('.hsc-menu-wrap .hsc-icon-btn')[0] as HTMLButtonElement).click();
    fixture.detectChanges();
    (el.querySelector('.hsc-menu-danger') as HTMLButtonElement).click();
    fixture.detectChanges();
    (el.querySelector('.hsc-confirm-actions .hsc-btn--ghost') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(el.querySelectorAll('.hsc-slide-row').length).toBe(2);
  });

  it('tracks unsaved changes and clears them after a single save', async () => {
    const { fixture, el, showcaseAdmin } = await render();

    expect(el.querySelector('.hsc-savebar-unsaved')).toBeNull();

    addSlideViaButton(el, fixture);
    expect(el.querySelector('.hsc-savebar-unsaved')?.textContent?.trim()).toBe('Unsaved changes');

    (el.querySelector('.hsc-btn--save') as HTMLButtonElement).click();
    await Promise.resolve();
    fixture.detectChanges();

    expect(showcaseAdmin.save).toHaveBeenCalledTimes(1);
    expect(el.querySelector('.hsc-savebar-unsaved')).toBeNull();
    expect(el.querySelector('.hsc-chip--saved')?.textContent?.trim()).toBe('All Changes Saved');
  });

  it('saves the configuration with sequential display orders in one payload', async () => {
    const { fixture, el, showcaseAdmin } = await render();

    addSlideViaButton(el, fixture);
    (el.querySelector('.hsc-btn--save') as HTMLButtonElement).click();
    await Promise.resolve();
    fixture.detectChanges();

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

  it('disables saving when there is nothing to save', async () => {
    const { fixture, el, showcaseAdmin } = await render();

    const saveBtn = el.querySelector('.hsc-btn--save') as HTMLButtonElement;
    expect(saveBtn.disabled).toBe(true);
    saveBtn.click();
    fixture.detectChanges();

    expect(showcaseAdmin.save).not.toHaveBeenCalled();
    expect(el.querySelector('.hsc-banner--error')).toBeNull();
  });

  it('refuses to save while the slide editor is open', async () => {
    const { fixture, el, showcaseAdmin } = await render();

    (el.querySelector('.hsc-btn--primary') as HTMLButtonElement).click();
    fixture.detectChanges();
    (el.querySelector('.hsc-btn--save') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(showcaseAdmin.save).not.toHaveBeenCalled();
    expect(el.querySelector('.hsc-banner--error')).not.toBeNull();
  });

  it('renders the live preview for enabled slides with images', async () => {
    const cfg: HeroShowcase = {
      enabled: true, autoplay: false, pauseOnHover: false, rotationIntervalSeconds: 8, transition: 'fade',
      items: [item('i1', { displayOrder: 1, imageUrl: 'https://res.cloudinary.com/x/image/upload/v1/hero.jpg' })],
      createdAt: '', updatedAt: '', updatedBy: 'admin',
    };
    const { el } = await render(cfg);
    expect(el.querySelector('.hsc-pv-hero')).not.toBeNull();
    expect(el.querySelector('.hsc-preview-counter')?.textContent?.trim()).toBe('Slide 1 / 1');
    expect(el.querySelector('.hsc-pv-img')).not.toBeNull();
  });

  it('links to the separate fallback Hero Banner page', async () => {
    const { el } = await render();
    const link = el.querySelector('a[routerlink="/admin/hero-banners"]');
    expect(link).not.toBeNull();
  });
});
