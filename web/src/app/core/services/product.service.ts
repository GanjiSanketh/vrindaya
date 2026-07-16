import { Injectable, inject, signal, computed } from '@angular/core';
import { Product, Category, Testimonial, LookItem, FeatureItem } from '../models/product.model';
import { ProductQueryService } from './product-query.service';
import { CategoryService } from './category.service';
import { ProductAnalyticsService } from './product-analytics.service';

export type SortOrder = 'default' | 'rating';

/**
 * Public storefront facade — same public method/signal names as before
 * (Firestore-realtime era), so `categories.ts`, `new-arrivals.ts`,
 * `trending-products.ts`, `customer-love.ts` need zero changes. Internally,
 * every signal is now populated by dedicated ProductQueryService/
 * CategoryService REST calls instead of one big Firestore `onSnapshot`
 * listener — Featured Products, New Arrivals, and Categories each hit their
 * own API query, matching the Phase 4 architecture.
 */
@Injectable({ providedIn: 'root' })
export class ProductService {
  private readonly productQuery = inject(ProductQueryService);
  private readonly categoryQuery = inject(CategoryService);
  private readonly productAnalytics = inject(ProductAnalyticsService);

  readonly loading = signal(true);
  readonly error   = signal<string | null>(null);

  readonly trending    = signal<Product[]>([]);
  readonly newArrivals = signal<Product[]>([]);
  readonly bestSellers = signal<Product[]>([]);
  readonly categories  = signal<Category[]>([]);

  readonly searchQuery      = signal('');
  readonly selectedCategory = signal('All');
  readonly sortOrder        = signal<SortOrder>('default');

  /** Union of everything fetched so far — best-effort cache for the lookups below (not an exhaustive catalog anymore; see fetchById for a reliable single-product fetch). */
  private readonly allLoaded = computed(() => {
    const byId = new Map<string, Product>();
    for (const p of [...this.trending(), ...this.newArrivals(), ...this.bestSellers()]) byId.set(p.id, p);
    return [...byId.values()];
  });

  constructor() {
    void this.loadHomeData();
  }

  private async loadHomeData(): Promise<void> {
    this.loading.set(true);

    const [featured, newArrivals, bestSellers, categories] = await Promise.allSettled([
      this.productQuery.getFeatured(12),
      this.productQuery.getNewArrivals(12),
      this.productQuery.getBestSellers(12),
      this.categoryQuery.getAll(),
    ]);

    if (featured.status === 'fulfilled')    this.trending.set(featured.value.items);
    if (newArrivals.status === 'fulfilled') this.newArrivals.set(newArrivals.value.items);
    if (bestSellers.status === 'fulfilled') this.bestSellers.set(bestSellers.value.items);
    if (categories.status === 'fulfilled')  this.categories.set(categories.value);

    const anyFailed = [featured, newArrivals, bestSellers, categories].some(r => r.status === 'rejected');
    this.error.set(anyFailed ? 'Some content could not be loaded right now.' : null);
    this.loading.set(false);
  }

  /* ── Lookups (best-effort, over whatever's already been fetched — see fetchById for a guaranteed fetch) ── */

  getById(id: string): Product | undefined {
    return this.allLoaded().find(p => p.id === id);
  }

  /** Reliable single-product fetch — always hits the API (cached/retried internally), used wherever a lookup must not silently miss (e.g. wishlist). */
  async fetchById(id: string): Promise<Product | null> {
    try {
      return await this.productQuery.getById(id);
    } catch {
      return null;
    }
  }

  /**
   * Best-effort snapshot for PopupService (trending/new-arrival/best-seller
   * campaign lookups — all backed by the same fetched buckets as
   * trending()/newArrivals()/bestSellers()). PopupService's arbitrary
   * "specific product id" campaign case isn't guaranteed to be covered by
   * this snapshot (see Pending Work) — a targeted follow-up should switch
   * that one lookup to fetchById().
   */
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

  /** Single choke point for the "Buy on Flipkart" CTA — fires click tracking, then opens the link. No-ops (no "Coming Soon" here — that's a template-level gate) when the product has no Flipkart URL yet. */
  openProduct(product: Product): void {
    if (typeof window === 'undefined' || !product.flipkartUrl) return;
    this.productAnalytics.recordClick(product.id);
    window.open(product.flipkartUrl, '_blank', 'noopener,noreferrer');
  }

  private categoryLabel(categoryId: string): string {
    return this.categories().find(c => c.id === categoryId)?.name ?? categoryId;
  }

  /* ── Static site content — unchanged, not products/categories, out of scope ── */
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
