import { Component, computed, inject, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser }                                         from '@angular/common';
import { RouterLink }                                                from '@angular/router';
import { ProductService }                                            from '../../../../core/services/product.service';
import { ProductCard }                                               from '../../../../shared/components/product-card/product-card';

type NaSortOrder = 'newest' | 'price-asc' | 'price-desc';

@Component({
  selector: 'app-new-arrivals-page',
  standalone: true,
  imports: [RouterLink, ProductCard],
  templateUrl: './new-arrivals-page.component.html',
  styleUrl: './new-arrivals-page.component.css',
})
export class NewArrivalsPageComponent implements OnInit {
  private readonly svc        = inject(ProductService);
  private readonly platformId = inject(PLATFORM_ID);

  readonly sortOrder = signal<NaSortOrder>('newest');

  readonly products = computed(() => {
    const raw = this.svc.newArrivals();
    switch (this.sortOrder()) {
      case 'price-asc':  return [...raw].sort((a, b) => a.price - b.price);
      case 'price-desc': return [...raw].sort((a, b) => b.price - a.price);
      default:           return [...raw].sort((a, b) => b.id - a.id);
    }
  });

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  setSort(event: Event): void {
    this.sortOrder.set((event.target as HTMLSelectElement).value as NaSortOrder);
  }
}
