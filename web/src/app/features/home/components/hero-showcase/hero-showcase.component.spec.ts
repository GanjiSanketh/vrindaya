import { TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideLocationMocks } from '@angular/common/testing';
import { HeroShowcaseComponent } from './hero-showcase.component';
import { HeroShowcase, HeroShowcaseItem } from '../../../../core/models/hero-showcase.model';

function item(id: string, overrides: Partial<HeroShowcaseItem> = {}): HeroShowcaseItem {
  return {
    itemId: id,
    imageUrl: `https://res.cloudinary.com/vrindaya/image/upload/${id}.jpg`,
    storagePath: `hero-showcase/items/${id}`,
    title: `Title ${id}`,
    subtitle: `Subtitle ${id}`,
    buttonText: 'Explore',
    buttonLink: '/shop',
    displayOrder: 1,
    enabled: true,
    createdAt: '',
    updatedAt: '',
    ...overrides,
  };
}

function config(overrides: Partial<HeroShowcase> = {}): HeroShowcase {
  return {
    enabled: true,
    autoplay: true,
    pauseOnHover: true,
    rotationIntervalSeconds: 8,
    transition: 'fade',
    items: [item('a'), item('b', { displayOrder: 2 })],
    createdAt: '',
    updatedAt: '',
    updatedBy: 'admin@vrindaya.in',
    ...overrides,
  };
}

describe('HeroShowcaseComponent', () => {
  function setup(cfg: HeroShowcase) {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [HeroShowcaseComponent],
      providers: [
        { provide: PLATFORM_ID, useValue: 'server' },
        provideRouter([]),
        provideLocationMocks(),
      ],
    });
    const fixture = TestBed.createComponent(HeroShowcaseComponent);
    fixture.componentRef.setInput('config', cfg);
    fixture.detectChanges();
    return { fixture, el: fixture.nativeElement as HTMLElement };
  }

  it('renders the active slide title, subtitle and button from the config', () => {
    const { el } = setup(config({ items: [item('a', { title: 'Wear the Grace', subtitle: 'Timeless elegance', buttonText: 'Shop Now' })] }));
    expect(el.querySelector('.hsc-title')?.textContent?.trim()).toBe('Wear the Grace');
    expect(el.querySelector('.hsc-subtitle')?.textContent?.trim()).toBe('Timeless elegance');
    expect(el.querySelector('.hsc-cta-btn')?.textContent?.trim()).toContain('Shop Now');
  });

  it('renders the active item image through the Cloudinary pipe', () => {
    const { el } = setup(config({ items: [item('img1', { imageUrl: 'https://res.cloudinary.com/vrindaya/image/upload/img1.jpg' })] }));
    const src = el.querySelector('.hsc-img')?.getAttribute('src') ?? '';
    expect(src).toContain('f_webp,q_auto');
    expect(src).toContain('img1');
  });

  it('orders enabled items by displayOrder and skips disabled ones', () => {
    const cfg = config({
      items: [
        item('c', { displayOrder: 3, title: 'Third' }),
        item('a', { displayOrder: 1, title: 'First' }),
        item('off', { displayOrder: 2, title: 'Disabled', enabled: false }),
        item('b', { displayOrder: 2, title: 'Second' }),
      ],
    });
    const { el } = setup(cfg);
    expect(el.querySelector('.hsc-title')?.textContent?.trim()).toBe('First');
  });

  it('jumps to another slide when a dot is selected', () => {
    const { fixture, el } = setup(config());
    const dots = el.querySelectorAll('.hsc-dot');
    expect(dots.length).toBe(2);
    (dots[1] as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(el.querySelector('.hsc-title')?.textContent?.trim()).toBe('Title b');
  });

  it('renders no dots when there is only one slide', () => {
    const { el } = setup(config({ items: [item('solo')] }));
    expect(el.querySelector('.hsc-dots')).toBeNull();
  });

  it('renders an internal button as a router link', async () => {
    const { fixture, el } = setup(config({ items: [item('a', { buttonLink: '/category/kurtas' })] }));
    await fixture.whenStable();
    expect(el.querySelector('.hsc-cta-btn')?.getAttribute('href')).toContain('/category/kurtas');
    expect(el.querySelector('.hsc-cta-btn')?.getAttribute('target')).not.toBe('_blank');
  });

  it('renders an external button link with target _blank', () => {
    const { el } = setup(config({ items: [item('a', { buttonLink: 'https://example.com/collection' })] }));
    const link = el.querySelector('.hsc-cta-btn');
    expect(link?.getAttribute('href')).toBe('https://example.com/collection');
    expect(link?.getAttribute('target')).toBe('_blank');
  });
});
