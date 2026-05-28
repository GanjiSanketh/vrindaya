import { Injectable, signal, computed } from '@angular/core';
import { Product } from '../models/product.model';
import { PRODUCTS } from '../data/products';

@Injectable({ providedIn: 'root' })
export class ProductService {
  private readonly allProducts = PRODUCTS;

  readonly searchQuery = signal('');
  readonly selectedCategory = signal('All');

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

  setCategory(category: string): void {
    this.selectedCategory.set(category);
  }

  setSearch(query: string): void {
    this.searchQuery.set(query);
  }

  openProduct(product: Product): void {
    if (typeof window !== 'undefined') {
      window.open(product.flipkartUrl, '_blank', 'noopener,noreferrer');
    }
  }
}
