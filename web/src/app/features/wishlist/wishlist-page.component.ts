import { Component, inject, computed, OnInit } from '@angular/core';
import { CommonModule }              from '@angular/common';
import { RouterLink }                from '@angular/router';
import { WishlistService }           from '../../core/services/wishlist.service';
import { ProductService }            from '../../core/services/product.service';
import { ProductCard }               from '../../shared/components/product-card/product-card';
import { ScrollRevealDirective }     from '../../shared/directives/scroll-reveal.directive';
import { SeoService }                from '../../core/services/seo.service';

@Component({
  selector: 'app-wishlist-page',
  standalone: true,
  imports: [CommonModule, RouterLink, ProductCard, ScrollRevealDirective],
  templateUrl: './wishlist-page.component.html',
  styleUrl: './wishlist-page.component.css',
})
export class WishlistPageComponent implements OnInit {
  private readonly wishlist    = inject(WishlistService);
  private readonly productSvc  = inject(ProductService);
  private readonly seo         = inject(SeoService);

  readonly wishlisted = computed(() => {
    const ids = this.wishlist.ids();
    return ids
      .map(id => this.productSvc.getById(id))
      .filter((p): p is NonNullable<typeof p> => p !== undefined);
  });

  readonly count = computed(() => this.wishlisted().length);

  ngOnInit(): void {
    this.seo.setPage({
      title: 'My Wishlist',
      description: 'Your saved Vrindaya pieces — curated with love.',
      keywords: ['wishlist', 'saved products', 'vrindaya favourites'],
      url: '/wishlist',
    });
  }
}
