import { TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideLocationMocks } from '@angular/common/testing';
import { signal } from '@angular/core';
import { PremiumProductShowcaseComponent } from './premium-product-showcase.component';
import { ProductService } from '../../../../core/services/product.service';
import { Product, Category } from '../../../../core/models/product.model';

function product(id: string, name: string, category = 'long-kurtas', image = `img-${id}.png`): Product {
  return {
    id, name, slug: id, category, image, price: 0, mrp: 0, discount: 0,
    sizes: [], stock: 0, sku: '', tags: [], featured: false, newArrival: false,
    bestSeller: false, active: true, displayOrder: 0, createdBy: '', createdAt: null,
    updatedBy: '', updatedAt: null, images: [], brand: '', deleted: false,
    marketplaceTags: [], websiteClickCount: 0, lifecycleStage: '', lowStockThreshold: 0,
    reservedStock: 0, autoHideWhenOutOfStock: false, isLowStock: false, isOutOfStock: false,
    hoverImage: undefined, isTrending: false, isNew: false, isBestSeller: false,
    rating: 0, flipkartUrl: '', variantCount: 0, totalStock: 0, lowestPrice: 0,
    highestPrice: 0,
  } as Product;
}

function category(id: string, name: string): Category {
  return { id, slug: id, name, image: '' };
}

function makeService() {
  return {
    trending: signal<Product[]>([]),
    newArrivals: signal<Product[]>([]),
    bestSellers: signal<Product[]>([]),
    categories: signal<Category[]>([]),
    loading: signal(true),
    get allProducts(): Product[] {
      return [
        ...this.trending(),
        ...this.newArrivals(),
        ...this.bestSellers(),
      ];
    },
    ensureHomeDataLoaded: () => Promise.resolve(),
  };
}

describe('PremiumProductShowcaseComponent', () => {
  function setup(overrides?: Partial<ReturnType<typeof makeService>>) {
    const svc = Object.assign(makeService(), overrides ?? {});
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [PremiumProductShowcaseComponent],
      providers: [
        { provide: PLATFORM_ID, useValue: 'server' },
        { provide: ProductService, useValue: svc },
        provideRouter([]),
        provideLocationMocks(),
      ],
    });
    return { svc, fixture: TestBed.createComponent(PremiumProductShowcaseComponent) };
  }

  it('renders the brand, heading and tagline', () => {
    const { fixture } = setup();
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.pis-brand')?.textContent?.trim()).toBe('Vrindaya');
    expect(el.querySelector('.pis-heading')?.textContent?.trim()).toBe('Wear the Grace');
    expect(el.querySelector('.pis-tagline')?.textContent?.trim()).toContain('modern women');
    expect(el.querySelector('.pis-cta-btn')?.getAttribute('href')).toContain('/shop');
  });

  it('shows a skeleton card while loading without a product', () => {
    const { fixture } = setup();
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.pis-card-skeleton')).not.toBeNull();
    expect(el.querySelector('.pis-media')).not.toBeNull();
  });

  it('prefers a featured product from ProductService.trending', () => {
    const featured = [product('f1', 'Featured Kurta'), product('f2', 'Second Featured')];
    const { fixture, svc } = setup();
    svc.trending.set(featured);
    svc.loading.set(false);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.pis-name')?.textContent?.trim()).toBe('Featured Kurta');
  });

  it('falls back to a new arrival when no featured products exist', () => {
    const { fixture, svc } = setup();
    svc.newArrivals.set([product('n1', 'Fresh Kurta')]);
    svc.loading.set(false);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.pis-name')?.textContent?.trim()).toBe('Fresh Kurta');
  });

  it('links the product image to the existing product route', async () => {
    const { fixture, svc } = setup();
    svc.trending.set([product('p-42', 'Featured Kurta')]);
    svc.loading.set(false);
    fixture.detectChanges();
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const href = el.querySelector('.pis-media-link')?.getAttribute('href');
    expect(href).toContain('/product/p-42');
  });

  it('links "View Collection" to the product category and shows the category badge', async () => {
    const { fixture, svc } = setup();
    svc.trending.set([product('p-1', 'Kurta', 'long-kurtas')]);
    svc.categories.set([category('long-kurtas', 'Long Kurtas')]);
    svc.loading.set(false);
    fixture.detectChanges();
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.pis-badge')?.textContent?.trim()).toBe('Long Kurtas');
    expect(el.querySelector('.pis-view')?.getAttribute('href')).toContain('/category/long-kurtas');
  });

  it('renders an empty state card when nothing has loaded', () => {
    const { fixture, svc } = setup();
    svc.loading.set(false);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.pis-card-empty')).not.toBeNull();
  });
});
