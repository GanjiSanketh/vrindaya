import { Component, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductService, SortOrder } from '../../core/services/product.service';
import { Product } from '../../core/models/product.model';
import { ProductCard } from '../../shared/components/product-card/product-card';
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
    { value: 'default', label: 'Default'   },
    { value: 'rating',  label: 'Top Rated' },
  ];

  get searchValue(): string { return this.productService.searchQuery(); }
  set searchValue(v: string) { this.productService.setSearch(v); }

  get currentSort(): SortOrder { return this.productService.sortOrder(); }

  setSort(order: SortOrder): void { this.productService.setSort(order); }

  selectCategory(id: string): void {
    this.productService.setCategory(id);
    document.getElementById('products')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  clearSearch(): void { this.productService.setSearch(''); }

  get displayProducts(): Product[] {
    switch (this.filter()) {
      case 'trending': return this.productService.trending();
      case 'new':      return this.productService.newArrivals();
      default:         return this.productService.filteredProducts();
    }
  }

  get isEmpty(): boolean { return this.displayProducts.length === 0; }

  get selectedCategory(): string { return this.productService.selectedCategory(); }
}
