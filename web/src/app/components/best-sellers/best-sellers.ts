import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProductCard } from '../../shared/components/product-card/product-card';
import { Product } from '../../core/models/product.model';

@Component({
  selector: 'app-best-sellers',
  standalone: true,
  imports: [ProductCard, RouterLink],
  templateUrl: './best-sellers.html',
  styleUrl: './best-sellers.css',
})
export class BestSellers {
  /** Supplied by the home page's single GET /homepage fetch — see HomepageService. */
  readonly products = input<Product[]>([]);
}
