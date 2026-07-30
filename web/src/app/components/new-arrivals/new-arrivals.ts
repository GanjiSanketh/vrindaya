import { Component, computed, input, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProductCardComponent } from '../../shared/components/product-card/product-card';
import { Product } from '../../core/models/product.model';

@Component({
  selector: 'app-new-arrivals',
  standalone: true,
  imports: [ProductCardComponent, RouterLink],
  templateUrl: './new-arrivals.html',
  styleUrl: './new-arrivals.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
// eslint-disable-next-line @angular-eslint/component-class-suffix
export class NewArrivals {
  /** Supplied by the home page's single GET /homepage fetch, already correctly ordered (automatic latest-active, or the admin's manual override) — no client-side re-sort needed. */
  readonly products = input<Product[]>([]);

  /** Homepage preview: first 4 only. */
  readonly preview = computed(() => this.products().slice(0, 4));
}
