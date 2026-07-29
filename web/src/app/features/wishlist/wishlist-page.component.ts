import { Component, inject, computed, effect, untracked, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule }              from '@angular/common';
import { RouterLink }                from '@angular/router';
import { WishlistService }           from '../../core/services/wishlist.service';
import { ProductService }            from '../../core/services/product.service';
import { Product }                   from '../../core/models/product.model';
import { ProductCardComponent }               from '../../shared/components/product-card/product-card';
import { SkeletonGridComponent }     from '../../shared/components/skeleton/skeleton-grid.component';
import { ScrollRevealDirective }     from '../../shared/directives/scroll-reveal.directive';
import { SeoService }                from '../../core/services/seo.service';

@Component({
  selector: 'app-wishlist-page',
  standalone: true,
  imports: [CommonModule, RouterLink, ProductCardComponent, SkeletonGridComponent, ScrollRevealDirective],
  templateUrl: './wishlist-page.component.html',
  styleUrl: './wishlist-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WishlistPageComponent implements OnInit {
  private readonly wishlist    = inject(WishlistService);
  private readonly productSvc  = inject(ProductService);
  private readonly seo         = inject(SeoService);

  /**
   * Wishlisted ids can point at any product (not just featured/new-arrival/
   * bestseller ones ProductService keeps cached) — each is fetched reliably
   * via the Product Details API (ProductService.fetchById), re-run whenever
   * the wishlist's id list changes.
   */
  readonly wishlisted = signal<Product[]>([]);
  readonly loading    = signal(true);
  readonly count      = computed(() => this.wishlisted().length);

  constructor() {
    effect(() => {
      const ids = this.wishlist.ids();
      untracked(() => void this.loadWishlisted(ids));
    });
  }

  private async loadWishlisted(ids: string[]): Promise<void> {
    this.loading.set(true);
    const results = await Promise.all(ids.map(id => this.productSvc.fetchById(id)));
    this.wishlisted.set(results.filter((p): p is Product => p !== null));
    this.loading.set(false);
  }

  ngOnInit(): void {
    this.seo.setPage({
      title: 'My Wishlist',
      description: 'Your saved Vrindaya pieces — curated with love.',
      keywords: ['wishlist', 'saved products', 'vrindaya favourites'],
      url: '/wishlist',
      jsonLd: {
        '@type': 'WebPage',
        'name': 'My Wishlist — Vrindaya',
        'url': 'https://vrindaya.in/wishlist',
        'description': 'Your saved Vrindaya pieces — curated with love.',
      },
    });
  }
}
