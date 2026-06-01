import { Component, input, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Product } from '../../models/product.model';
import { ProductService } from '../../services/product.service';

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './product-card.html',
  styleUrl: './product-card.css',
})
export class ProductCard {
  private productService = inject(ProductService);

  product = input.required<Product>();

  readonly wishlisted = signal(false);
  readonly imgError   = signal(false);

  toggleWishlist(e: Event): void {
    e.stopPropagation();
    this.wishlisted.update(v => !v);
  }

  openFlipart(e: Event): void {
    e.stopPropagation();
    this.productService.openProduct(this.product());
  }

  onImgError(): void { this.imgError.set(true); }
}
