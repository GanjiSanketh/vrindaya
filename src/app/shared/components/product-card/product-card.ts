import { Component, input, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Product }           from '../../../core/models/product.model';
import { ProductService }    from '../../../core/services/product.service';
import { QuickViewService }  from '../../../core/services/quick-view.service';

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './product-card.html',
  styleUrl: './product-card.css',
})
export class ProductCard {
  private readonly productService = inject(ProductService);
  private readonly quickView      = inject(QuickViewService);

  product = input.required<Product>();

  readonly imgError = signal(false);

  openFlipart(e: Event): void {
    e.stopPropagation();
    this.productService.openProduct(this.product());
  }

  openQuickView(e: Event): void {
    e.stopPropagation();
    this.quickView.open(this.product());
  }

  onImgError(): void { this.imgError.set(true); }
}
