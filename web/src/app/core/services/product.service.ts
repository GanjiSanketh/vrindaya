import { Injectable, inject, signal, computed, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Product, Category, Testimonial, LookItem, FeatureItem } from '../models/product.model';
import { ProductQueryService } from './product-query.service';
import { CategoryService } from './category.service';
import { AnalyticsService } from '../analytics/analytics.service';

export type SortOrder = 'default' | 'rating';

/** Hard ceiling for a single home-page data fetch. The global timeoutInterceptor
 *  already bounds every request to 30s; this guarantees the aggregated
 *  Promise.allSettled below can never hang the loading state indefinitely. */
const HOME_DATA_TIMEOUT_MS = 20_000;

@Injectable({ providedIn: 'root' })
export class ProductService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly productQuery = inject(ProductQueryService);
  private readonly categoryQuery = inject(CategoryService);
  private readonly analytics = inject(AnalyticsService);

  readonly loading = signal(true);
  readonly error   = signal<string | null>(null);

  readonly trending       = signal<Product[]>([]);
  readonly newArrivals    = signal<Product[]>([]);
  readonly bestSellers    = signal<Product[]>([]);
  readonly categories     = signal<Category[]>([]);

  readonly trendingLoading       = signal(false);
  readonly newArrivalsLoading    = signal(false);
  readonly bestSellersLoading    = signal(false);
  readonly categoriesLoading     = signal(false);

  readonly searchQuery      = signal('');
  readonly selectedCategory = signal('All');
  readonly sortOrder        = signal<SortOrder>('default');

  private readonly allLoaded = computed(() => {
    const byId = new Map<string, Product>();
    for (const p of [...this.trending(), ...this.newArrivals(), ...this.bestSellers()]) byId.set(p.id, p);
    return [...byId.values()];
  });

  private homeDataLoaded = false;

  /** Ensures home page data is loaded (lazy — no constructor call). Safe to call multiple times; subsequent calls are no-ops. */
  async ensureHomeDataLoaded(): Promise<void> {
    if (this.homeDataLoaded) return;

    // SSR/prerender must NEVER hit the network: the prerender framework waits
    // for the app to become stable and aborts (default 10s) while these
    // requests are still pending — exactly what broke the Vercel build.
    // Leave the flag unset so the browser still loads the data after hydration.
    if (!isPlatformBrowser(this.platformId)) {
      console.warn('[ProductService] ensureHomeDataLoaded() skipped during SSR/prerender — data loads in the browser.');
      return;
    }

    this.homeDataLoaded = true;
    return this.loadHomeData();
  }

  private async loadHomeData(): Promise<void> {
    this.loading.set(true);

    this.trendingLoading.set(true);
    this.newArrivalsLoading.set(true);
    this.bestSellersLoading.set(true);
    this.categoriesLoading.set(true);

    const [featured, newArrivals, bestSellers, categories] = await Promise.allSettled([
      this.withTimeout('featured', this.productQuery.getFeatured(12)),
      this.withTimeout('newArrivals', this.productQuery.getNewArrivals(12)),
      this.withTimeout('bestSellers', this.productQuery.getBestSellers(12)),
      this.withTimeout('categories', this.categoryQuery.getAll()),
    ]);

    if (featured.status === 'fulfilled')    { this.trending.set(featured.value.items);    this.trendingLoading.set(false); }
    else                                    { this.trendingLoading.set(false); }
    if (newArrivals.status === 'fulfilled') { this.newArrivals.set(newArrivals.value.items); this.newArrivalsLoading.set(false); }
    else                                    { this.newArrivalsLoading.set(false); }
    if (bestSellers.status === 'fulfilled') { this.bestSellers.set(bestSellers.value.items); this.bestSellersLoading.set(false); }
    else                                    { this.bestSellersLoading.set(false); }
    if (categories.status === 'fulfilled')  { this.categories.set(categories.value);     this.categoriesLoading.set(false); }
    else                                    { this.categoriesLoading.set(false); }

    const anyFailed = [featured, newArrivals, bestSellers, categories].some(r => r.status === 'rejected');
    this.error.set(anyFailed ? 'Some content could not be loaded right now.' : null);
    this.loading.set(false);
  }

  /**
   * Bounds a single home-page fetch so no Promise can wait forever. On timeout
   * it rejects (logged), which Promise.allSettled above converts into the
   * "some content could not be loaded" fallback instead of a hang.
   */
  private withTimeout<T>(label: string, promise: Promise<T>, ms = HOME_DATA_TIMEOUT_MS): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        console.warn(`[ProductService] "${label}" did not settle within ${ms}ms — falling back to empty data.`);
        reject(new Error(`${label} request timed out`));
      }, ms);
      promise.then(
        value => { clearTimeout(timer); resolve(value); },
        error => { clearTimeout(timer); reject(error); },
      );
    });
  }

  getById(id: string): Product | undefined {
    return this.productQuery.getCachedProduct(id) ?? this.allLoaded().find(p => p.id === id);
  }

  async fetchById(id: string): Promise<Product | null> {
    try {
      return await this.productQuery.getById(id);
    } catch {
      return null;
    }
  }

  get allProducts(): Product[] { return this.allLoaded(); }

  getBySlug(slug: string): Product | undefined {
    return this.allLoaded().find(p => p.slug === slug);
  }

  getByCategory(categoryId: string): Product[] {
    return this.allLoaded().filter(p => p.category === categoryId);
  }

  readonly filteredProducts = computed(() => {
    let list = [...this.allLoaded()];

    if (this.selectedCategory() !== 'All') {
      list = list.filter(p => p.category === this.selectedCategory());
    }

    const q = this.searchQuery().trim().toLowerCase();
    if (q) {
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) || this.categoryLabel(p.category).toLowerCase().includes(q),
      );
    }

    switch (this.sortOrder()) {
      case 'rating': return list.sort((a, b) => b.rating - a.rating);
      default:       return list;
    }
  });

  setCategory(id: string): void { this.selectedCategory.set(id); }
  setSearch(q: string):    void { this.searchQuery.set(q); }
  setSort(o: SortOrder):   void { this.sortOrder.set(o); }

  openProduct(product: Product): void {
    if (typeof window === 'undefined' || !product.flipkartUrl) return;
    this.analytics.trackLegacyClick(product.id);
    window.open(product.flipkartUrl, '_blank', 'noopener,noreferrer');
  }

  private categoryLabel(categoryId: string): string {
    return this.categories().find(c => c.id === categoryId)?.name ?? categoryId;
  }

  readonly testimonials: Testimonial[] = [
    { id: 1, name: 'Priya Sharma', location: 'Hyderabad', rating: 5, review: 'The fabric is so soft and comfortable. Perfect fit and exactly as shown in the pictures. Totally in love!', image: 'assets/images/testimonials/priya-sharma.jpg' },
    { id: 2, name: 'Sneha Iyer',   location: 'Bangalore', rating: 5, review: 'Beautiful design and amazing quality. I received so many compliments when I wore it!',                       image: 'assets/images/testimonials/sneha-iyer.jpg'  },
    { id: 3, name: 'Kavya Reddy',  location: 'Pune',      rating: 5, review: 'Loved the color, fit and quality. Vrindaya has become my go-to brand for ethnic wear now!',                 image: 'assets/images/testimonials/kavya-reddy.jpg' },
    { id: 4, name: 'Aditi Verma',  location: 'Delhi',     rating: 5, review: 'Super elegant and perfect for everyday wear. The material is breathable and feels so premium.',             image: 'assets/images/testimonials/aditi-verma.jpg' },
  ];

  readonly lookItems: LookItem[] = [
    { title: 'Everyday Grace',        subtitle: 'Effortless styles for your everyday moments.',        image: 'assets/products/001-wine-mandala-kurta/gallery-1.png',          categoryId: 'long-kurtas'  },
    { title: 'Festive Favorites',     subtitle: 'Celebrate traditions in timeless elegance.',          image: 'assets/products/002-indigo-floral-kurta-set/gallery-1.png',     categoryId: '3-piece-sets' },
    { title: 'Soft & Serene',         subtitle: 'Pretty hues for your soft girl moments.',            image: 'assets/products/005-fuchsia-floral-kurta-set/gallery-1.png',    categoryId: '3-piece-sets' },
    { title: 'Minimal. Modern. You.', subtitle: 'Understated styles with a modern soul.',             image: 'assets/products/003-black-gold-embroidered-kurti/gallery-1.png', categoryId: 'short-kurtas' },
    { title: 'Garden of Elegance',    subtitle: 'Inspired by florals, made for you.',                 image: 'assets/products/008-green-floral-kurta-set/gallery-1.png',      categoryId: '3-piece-sets' },
    { title: 'Grace in Every Detail', subtitle: 'Thoughtful details that make every outfit special.', image: 'assets/products/004-pastel-stripe-kurta/gallery-1.png',         categoryId: 'long-kurtas'  },
    { title: 'Bold & Beautiful',      subtitle: 'For women who love to make an entrance.',            image: 'assets/products/007-purple-embroidered-dress/gallery-1.png',    categoryId: 'short-kurtas' },
  ];

  readonly features: FeatureItem[] = [
    { icon: 'bi-flower1',      title: 'Premium Fabrics',      desc: 'Carefully selected fabrics that feel luxurious, look elegant and last long.',  image: 'assets/products/004-pastel-stripe-kurta/gallery-1.png'      },
    { icon: 'bi-person-dress', title: 'Elegant Designs',      desc: 'Timeless prints and patterns crafted to make every moment special.',          image: 'assets/products/001-wine-mandala-kurta/gallery-1.png'       },
    { icon: 'bi-heart',        title: 'Made for Every Woman', desc: 'Designed to celebrate every body type, every mood and every occasion.',       image: 'assets/products/009-teal-floral-kurta-set/gallery-1.png'    },
    { icon: 'bi-truck',        title: 'Pan India Delivery',   desc: 'Fast, reliable and secure delivery across India right to your doorstep.',     image: 'assets/products/005-fuchsia-floral-kurta-set/gallery-1.png' },
  ];
}
