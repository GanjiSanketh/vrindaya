import { Component, computed, inject, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser }                                         from '@angular/common';
import { RouterLink }                                                from '@angular/router';
import { ProductService }                                            from '../../../../core/services/product.service';
import { ProductCard }                                               from '../../../../shared/components/product-card/product-card';
import { SeoService }                                                from '../../../../core/services/seo.service';

type TrendSortOrder = 'popularity' | 'price-asc' | 'price-desc';

@Component({
  selector: 'app-trending-page',
  standalone: true,
  imports: [RouterLink, ProductCard],
  templateUrl: './trending-page.component.html',
  styleUrl: './trending-page.component.css',
})
export class TrendingPageComponent implements OnInit {
  private readonly svc        = inject(ProductService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly seo        = inject(SeoService);

  readonly sortOrder = signal<TrendSortOrder>('popularity');

  readonly products = computed(() => {
    const raw = this.svc.trending();
    switch (this.sortOrder()) {
      case 'price-asc':  return [...raw].sort((a, b) => a.price - b.price);
      case 'price-desc': return [...raw].sort((a, b) => b.price - a.price);
      default:           return [...raw].sort((a, b) => b.rating - a.rating);
    }
  });

  ngOnInit(): void {
    this.seo.setPage({
      title:       'Trending Ethnic Wear',
      description: 'Discover the most popular Indian ethnic wear at Vrindaya. Trending kurtas and sets loved by women across India. Free delivery.',
      keywords:    ['trending ethnic wear', 'popular kurtas', 'bestselling kurta', 'most loved ethnic wear'],
      url:         '/trending',
    });
    if (isPlatformBrowser(this.platformId)) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  setSort(event: Event): void {
    this.sortOrder.set((event.target as HTMLSelectElement).value as TrendSortOrder);
  }
}
