import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProductCardComponent } from '../../shared/components/product-card/product-card';
import { Product } from '../../core/models/product.model';

@Component({
  selector: 'app-trending-products',
  standalone: true,
  imports: [ProductCardComponent, RouterLink],
  templateUrl: './trending-products.html',
  styleUrl: './trending-products.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrendingProducts {
  /** Supplied by the home page's single GET /homepage fetch — see HomepageService. */
  readonly products = input<Product[]>([]);
}
