import {
  Component, input, inject, signal, computed, effect, isDevMode, PLATFORM_ID, ChangeDetectionStrategy,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CommonModule }           from '@angular/common';
import { Product }                from '../../../core/models/product.model';
import { ProductService }         from '../../../core/services/product.service';
import { QuickViewService }       from '../../../core/services/quick-view.service';
import { WishlistService }        from '../../../core/services/wishlist.service';
import { RecentlyViewedService }  from '../../../core/services/recently-viewed.service';

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './product-card.html',
  styleUrl: './product-card.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductCard {
  private readonly productService  = inject(ProductService);
  private readonly quickView       = inject(QuickViewService);
  readonly wishlist                = inject(WishlistService);
  private readonly recentlyViewed  = inject(RecentlyViewedService);
  private readonly platformId      = inject(PLATFORM_ID);

  product = input.required<Product>();

  readonly imgError      = signal(false);
  readonly hoverImgError = signal(false);
  readonly isWishlisted  = computed(() => this.wishlist.has(this.product().id));

  /**
   * Resolved hover image: explicit hoverImage field → gallery[0] → null (no hover).
   * gallery[0] is the first alternate-angle shot, distinct from the cover.
   */
  readonly hoverImage = computed<string | null>(() => {
    const p = this.product();
    return p.hoverImage ?? p.gallery?.[0] ?? null;
  });

  /** True when no second image exists or the hover image failed to load. */
  readonly noHover = computed(() => {
    if (this.hoverImgError()) return true;
    return !this.hoverImage();
  });

  constructor() {
    if (isDevMode()) {
      effect(() => {
        const p = this.product();
        console.log('[IMAGE] Product images:', p.images);
        console.log('[IMAGE] Primary image URL:', p.image);
        console.log('[IMAGE] Hover image URL:', this.hoverImage());
        console.log('[IMAGE] Gallery:', p.gallery);
      });
    }

    effect(() => {
      const src = this.hoverImage();
      if (!isPlatformBrowser(this.platformId) || !src) return;
      const preload = new Image();
      preload.src = src;
    });
  }

  openFlipart(e: Event): void {
    e.stopPropagation();
    this.recentlyViewed.track(this.product());
    this.productService.openProduct(this.product());
  }

  openQuickView(e: Event): void {
    e.stopPropagation();
    this.recentlyViewed.track(this.product());
    this.quickView.open(this.product());
  }

  toggleWishlist(e: Event): void {
    e.stopPropagation();
    this.wishlist.toggle(this.product().id);
  }

  onImgError(): void {
    if (isDevMode()) console.warn('[IMAGE] Cover image failed:', this.product().image);
    this.imgError.set(true);
  }

  onHoverImgError(): void {
    if (isDevMode()) console.warn('[IMAGE] Hover image failed — falling back to cover:', this.hoverImage());
    this.hoverImgError.set(true);
  }
}
