import { Component, inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ProductService } from '../../services/product.service';
import { ProductCard } from '../product-card/product-card';

@Component({
  selector: 'app-trending-products',
  standalone: true,
  imports: [CommonModule, ProductCard],
  templateUrl: './trending-products.html',
  styleUrl: './trending-products.css',
})
export class TrendingProducts {
  private platformId = inject(PLATFORM_ID);
  protected svc = inject(ProductService);

  readonly products = this.svc.trending;

  scrollToAll(): void {
    if (isPlatformBrowser(this.platformId)) {
      document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' });
    }
  }
}
