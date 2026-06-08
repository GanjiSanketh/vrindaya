import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProductService } from '../../services/product.service';
import { ProductCard } from '../product-card/product-card';

@Component({
  selector: 'app-new-arrivals',
  standalone: true,
  imports: [ProductCard, RouterLink],
  templateUrl: './new-arrivals.html',
  styleUrl: './new-arrivals.css',
})
export class NewArrivals {
  private readonly svc = inject(ProductService);

  // Sort by id descending so highest-numbered (most recently added) products appear first
  readonly products = computed(() =>
    [...this.svc.newArrivals()].sort((a, b) => b.id - a.id)
  );

  // Homepage preview: first 4 only
  readonly preview = computed(() => this.products().slice(0, 4));
}
