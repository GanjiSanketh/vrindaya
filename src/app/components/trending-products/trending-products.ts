import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProductService } from '../../services/product.service';
import { ProductCard } from '../product-card/product-card';

@Component({
  selector: 'app-trending-products',
  standalone: true,
  imports: [ProductCard, RouterLink],
  templateUrl: './trending-products.html',
  styleUrl: './trending-products.css',
})
export class TrendingProducts {
  protected readonly svc = inject(ProductService);
  readonly products = this.svc.trending;
}
