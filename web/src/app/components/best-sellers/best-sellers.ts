import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProductCardComponent } from '../../shared/components/product-card/product-card';
import { Product } from '../../core/models/product.model';

@Component({
  selector: 'app-best-sellers',
  standalone: true,
  imports: [ProductCardComponent, RouterLink],
  templateUrl: './best-sellers.html',
  styleUrl: './best-sellers.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
// eslint-disable-next-line @angular-eslint/component-class-suffix
export class BestSellers {
  /** Supplied by the home page's single GET /homepage fetch — see HomepageService. */
  readonly products = input<Product[]>([]);
}
