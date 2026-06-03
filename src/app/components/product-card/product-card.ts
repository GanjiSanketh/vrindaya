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

  readonly imgError = signal(false);

  openFlipart(e: Event): void {
    e.stopPropagation();
    this.productService.openProduct(this.product());
  }

  onImgError(): void { this.imgError.set(true); }
}
