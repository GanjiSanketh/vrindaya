import { Component, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductService } from '../../shared/product.service';
import { Product } from '../../models/product.model';
import { ProductCard } from '../product-card/product-card';

@Component({
  selector: 'app-product-grid',
  imports: [CommonModule, ProductCard],
  templateUrl: './product-grid.html',
  styleUrl: './product-grid.css',
})
export class ProductGrid {
  private productService = inject(ProductService);

  filter = input<'trending' | 'new' | 'all'>('all');

  readonly isLoading = signal(false);

  private readonly allProducts = this.productService.filteredProducts;
  private readonly trending = this.productService.trendingProducts;
  private readonly newItems = this.productService.newArrivals;

  get displayProducts(): Product[] {
    switch (this.filter()) {
      case 'trending':
        return this.trending();
      case 'new':
        return this.newItems();
      default:
        return this.allProducts();
    }
  }

  get isEmpty(): boolean {
    return this.displayProducts.length === 0;
  }
}
