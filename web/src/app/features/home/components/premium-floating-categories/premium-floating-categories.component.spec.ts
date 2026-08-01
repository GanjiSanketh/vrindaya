import { TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideLocationMocks } from '@angular/common/testing';
import { PremiumFloatingCategoriesComponent } from './premium-floating-categories.component';
import { Category } from '../../../../core/models/product.model';

function category(id: string, name: string, image: string, subtitle?: string): Category {
  return { id, slug: id, name, image, subtitle };
}

describe('PremiumFloatingCategoriesComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PremiumFloatingCategoriesComponent],
      providers: [
        { provide: PLATFORM_ID, useValue: 'server' },
        provideRouter([]),
        provideLocationMocks(),
      ],
    }).compileComponents();
  });

  it('renders the heading and sub-heading', () => {
    const fixture = TestBed.createComponent(PremiumFloatingCategoriesComponent);
    fixture.componentRef.setInput('categories', [
      category('long-kurtas', 'Long Kurtas', 'a.png'),
    ]);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.pfc-heading')?.textContent?.trim()).toBe('Wear the Grace');
    expect(el.querySelector('.pfc-sub')?.textContent?.trim()).toContain(
      'timeless ethnic fashion crafted for everyday elegance',
    );
  });

  it('orders and limits the four showcase categories with fallback subtitles', () => {
    const fixture = TestBed.createComponent(PremiumFloatingCategoriesComponent);
    fixture.componentRef.setInput('categories', [
      category('long-kurtas', 'Long Kurtas', 'long.png'),
      category('short-kurtas', 'Short Kurtas', 'short.png'),
      category('2-piece-sets', 'Coord Sets', 'coord.png'),
      category('3-piece-sets', '3-Piece Sets', 'three.png'),
      category('extra', 'Extra', 'extra.png'),
    ]);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const names = [...el.querySelectorAll<HTMLElement>('.pfc-name')].map(n => n.textContent?.trim());
    expect(names).toEqual(['Long Kurtas', 'Short Kurtas', 'Coord Sets', '3-Piece Sets']);
    expect(el.querySelectorAll('.pfc-card').length).toBe(4);

    const subs = [...el.querySelectorAll<HTMLElement>('.pfc-subtitle')].map(n => n.textContent?.trim());
    expect(subs).toEqual([
      'Elegant Everyday Styles',
      'Comfort Meets Style',
      'Effortlessly Coordinated',
      'Complete Ethnic Elegance',
    ]);
  });

  it('uses the category-provided subtitle when present', () => {
    const fixture = TestBed.createComponent(PremiumFloatingCategoriesComponent);
    fixture.componentRef.setInput('categories', [
      category('long-kurtas', 'Long Kurtas', 'long.png', 'Custom Tagline'),
    ]);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.pfc-subtitle')?.textContent?.trim()).toBe('Custom Tagline');
  });

  it('links each card to the existing category route', async () => {
    const fixture = TestBed.createComponent(PremiumFloatingCategoriesComponent);
    fixture.componentRef.setInput('categories', [
      category('long-kurtas', 'Long Kurtas', 'long.png'),
      category('short-kurtas', 'Short Kurtas', 'short.png'),
      category('2-piece-sets', 'Coord Sets', 'coord.png'),
      category('3-piece-sets', '3-Piece Sets', 'three.png'),
    ]);
    fixture.detectChanges();
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const hrefs = [...el.querySelectorAll<HTMLAnchorElement>('.pfc-card')].map(a => a.getAttribute('href'));
    expect(hrefs).toEqual([
      expect.stringContaining('/category/long-kurtas'),
      expect.stringContaining('/category/short-kurtas'),
      expect.stringContaining('/category/2-piece-sets'),
      expect.stringContaining('/category/3-piece-sets'),
    ]);
  });

  it('falls back to the first four categories when no preferred ids exist', () => {
    const fixture = TestBed.createComponent(PremiumFloatingCategoriesComponent);
    fixture.componentRef.setInput('categories', [
      category('a', 'Alpha', 'a.png'),
      category('b', 'Beta', 'b.png'),
      category('c', 'Gamma', 'c.png'),
      category('d', 'Delta', 'd.png'),
    ]);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const names = [...el.querySelectorAll<HTMLElement>('.pfc-name')].map(n => n.textContent?.trim());
    expect(names).toEqual(['Alpha', 'Beta', 'Gamma', 'Delta']);
  });

  it('shows skeleton tiles while loading', () => {
    const fixture = TestBed.createComponent(PremiumFloatingCategoriesComponent);
    fixture.componentRef.setInput('loading', true);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelectorAll('.pfc-skeleton-card').length).toBe(4);
    expect(el.querySelectorAll('.pfc-card').length).toBe(4);
  });
});
