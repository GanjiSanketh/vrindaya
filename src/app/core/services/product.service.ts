import { Injectable, inject, signal, computed } from '@angular/core';
import { Product, Category, Testimonial, LookItem, FeatureItem } from '../models/product.model';
import { ProductStoreService }                                     from './product-store.service';

export type SortOrder = 'default' | 'price-asc' | 'price-desc' | 'rating';

@Injectable({ providedIn: 'root' })
export class ProductService {
  private readonly _store = inject(ProductStoreService);

  /* Live view of the store — re-evaluates whenever admin makes changes */
  private readonly _products = computed(() => this._store.products());

  readonly searchQuery      = signal('');
  readonly selectedCategory = signal('All');
  readonly sortOrder        = signal<SortOrder>('default');

  /* ── Derived collections (all reactive to store changes) ── */
  readonly trending    = computed(() => this._products().filter(p => p.isTrending));
  readonly newArrivals = computed(() => this._products().filter(p => p.isNew));
  readonly bestSellers = computed(() => this._products().filter(p => p.isBestSeller));

  readonly filteredProducts = computed(() => {
    let list = [...this._products()];

    if (this.selectedCategory() !== 'All') {
      list = list.filter(p => p.categoryId === this.selectedCategory());
    }

    const q = this.searchQuery().trim().toLowerCase();
    if (q) {
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)
      );
    }

    switch (this.sortOrder()) {
      case 'price-asc':  return list.sort((a, b) => a.price - b.price);
      case 'price-desc': return list.sort((a, b) => b.price - a.price);
      case 'rating':     return list.sort((a, b) => b.rating - a.rating);
      default:           return list;
    }
  });

  /* Full list for global search — returns current snapshot */
  get allProducts(): Product[] { return this._store.products(); }

  /* ── Lookups ── */
  getById(id: number): Product | undefined {
    return this._products().find(p => p.id === id);
  }

  getByCategory(categoryId: string): Product[] {
    return this._products().filter(p => p.categoryId === categoryId);
  }

  setCategory(id: string): void { this.selectedCategory.set(id); }
  setSearch(q: string):    void { this.searchQuery.set(q); }
  setSort(o: SortOrder):   void { this.sortOrder.set(o); }

  openProduct(product: Product): void {
    if (typeof window !== 'undefined') {
      window.open(product.flipkartUrl, '_blank', 'noopener,noreferrer');
    }
  }

  /* ── Static catalog data ── */
  readonly categories: Category[] = [
    { id: 'long-kurtas',  name: 'Long Kurtas',       subtitle: 'Elegant Everyday Styles',     image: 'assets/products/001-wine-mandala-kurta/cover.png'          },
    { id: 'short-kurtas', name: 'Short Kurtas',       subtitle: 'Comfort Meets Style',          image: 'assets/products/003-black-gold-embroidered-kurti/cover.png' },
    { id: '2-piece-sets', name: '2-Piece Kurta Sets', subtitle: 'Perfectly Coordinated Looks', image: 'assets/products/010-peach-flower-print-2-piece-kurti/cover.png' },
    { id: '3-piece-sets', name: '3-Piece Kurta Sets', subtitle: 'Complete Ethnic Elegance',    image: 'assets/products/002-indigo-floral-kurta-set/cover.png'      },
  ];

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
