import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProductCardComponent } from '../../shared/components/product-card/product-card';
import { Product } from '../../core/models/product.model';
import { RevealDirective } from '../../features/home/directives/reveal.directive';

@Component({
  selector: 'app-trending-products',
  standalone: true,
  imports: [ProductCardComponent, RouterLink, RevealDirective],
  templateUrl: './trending-products.html',
  styleUrl: './trending-products.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
// eslint-disable-next-line @angular-eslint/component-class-suffix
export class TrendingProducts {
  /** Supplied by the home page's single GET /homepage fetch — see HomepageService. */
  readonly products = input<Product[]>([]);
}
