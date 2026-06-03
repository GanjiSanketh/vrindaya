import { Component, computed, inject, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ProductService } from '../../services/product.service';
import { ProductCard } from '../../components/product-card/product-card';
import { Navbar } from '../../components/navbar/navbar';
import { Footer } from '../../components/footer/footer';

type TrendSortOrder = 'popularity' | 'price-asc' | 'price-desc';

@Component({
  selector: 'app-trending-page',
  standalone: true,
  imports: [RouterLink, ProductCard, Navbar, Footer],
  templateUrl: './trending-page.component.html',
  styleUrl: './trending-page.component.css',
})
export class TrendingPageComponent implements OnInit {
  private readonly svc        = inject(ProductService);
  private readonly platformId = inject(PLATFORM_ID);

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
    if (isPlatformBrowser(this.platformId)) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  setSort(event: Event): void {
    this.sortOrder.set((event.target as HTMLSelectElement).value as TrendSortOrder);
  }
}
