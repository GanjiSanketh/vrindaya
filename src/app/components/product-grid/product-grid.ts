import { Component, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductService, SortOrder } from '../../shared/product.service';
import { Product } from '../../models/product.model';
import { ProductCard } from '../product-card/product-card';
import { CATEGORIES } from '../../data/categories';

interface SortOption { value: SortOrder; label: string; }

@Component({
  selector: 'app-product-grid',
  imports: [CommonModule, FormsModule, ProductCard],
  templateUrl: './product-grid.html',
  styleUrl: './product-grid.css',
})
export class ProductGrid {
  protected productService = inject(ProductService);

  filter = input<'trending' | 'new' | 'all'>('all');

  readonly categories = CATEGORIES;

  readonly sortOptions: SortOption[] = [
    { value: 'newest',     label: 'Newest'          },
    { value: 'trending',   label: 'Trending'         },
    { value: 'price-asc',  label: 'Price: Low → High' },
    { value: 'price-desc', label: 'Price: High → Low' },
  ];

  /* Live search value bound to the ProductService signal */
  get searchValue(): string { return this.productService.searchQuery(); }
  set searchValue(v: string) { this.productService.setSearch(v); }

  get currentSort(): SortOrder { return this.productService.sortOrder(); }

  setSort(order: SortOrder): void { this.productService.setSortOrder(order); }

  selectCategory(id: string): void {
    this.productService.setCategory(id);
    document.getElementById('products')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  clearSearch(): void { this.productService.setSearch(''); }

  get displayProducts(): Product[] {
    switch (this.filter()) {
      case 'trending': return this.productService.trendingProducts();
      case 'new':      return this.productService.newArrivals();
      default:         return this.productService.sortedProducts();
    }
  }

  get isEmpty(): boolean { return this.displayProducts.length === 0; }

  /* Used only in 'all' mode */
  get selectedCategory(): string { return this.productService.selectedCategory(); }
}
