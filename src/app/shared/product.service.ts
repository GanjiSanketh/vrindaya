import { Injectable, signal, computed } from '@angular/core';
import { Product } from '../models/product.model';
import { PRODUCTS } from '../data/products';

export type SortOrder = 'newest' | 'trending' | 'price-asc' | 'price-desc';

@Injectable({ providedIn: 'root' })
export class ProductService {
  private readonly allProducts = PRODUCTS;

  readonly searchQuery = signal('');
  readonly selectedCategory = signal('All');
  readonly sortOrder = signal<SortOrder>('newest');

  readonly trendingProducts = computed(() => this.allProducts.filter((p) => p.isTrending));

  readonly newArrivals = computed(() => this.allProducts.filter((p) => p.isNew));

  readonly filteredProducts = computed(() => {
    let products = this.allProducts;

    if (this.selectedCategory() !== 'All') {
      products = products.filter((p) => p.category === this.selectedCategory());
    }

    const query = this.searchQuery().trim().toLowerCase();
    if (query) {
      products = products.filter(
        (p) => p.name.toLowerCase().includes(query) || p.category.toLowerCase().includes(query),
      );
    }

    return products;
  });

  readonly sortedProducts = computed(() => {
    const products = [...this.filteredProducts()];
    switch (this.sortOrder()) {
      case 'trending':
        return products.sort((a, b) => (b.isTrending ? 1 : 0) - (a.isTrending ? 1 : 0));
      case 'price-asc':
        return products.sort((a, b) => a.price - b.price);
      case 'price-desc':
        return products.sort((a, b) => b.price - a.price);
      default:
        return products.sort((a, b) => (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0) || b.id - a.id);
    }
  });

  setCategory(category: string): void {
    this.selectedCategory.set(category);
  }

  setSearch(query: string): void {
    this.searchQuery.set(query);
  }

  setSortOrder(order: SortOrder): void {
    this.sortOrder.set(order);
  }

  openProduct(product: Product): void {
    if (typeof window !== 'undefined') {
      window.open(product.flipkartUrl, '_blank', 'noopener,noreferrer');
    }
  }
}
