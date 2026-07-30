import {
  Component, input, inject, signal, computed, effect, PLATFORM_ID, ChangeDetectionStrategy,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CommonModule }           from '@angular/common';
import { Product }                from '../../../core/models/product.model';
import { ProductService }         from '../../../core/services/product.service';
import { QuickViewService }       from '../../../core/services/quick-view.service';
import { WishlistService }        from '../../../core/services/wishlist.service';
import { RecentlyViewedService }  from '../../../core/services/recently-viewed.service';
import { LoggerService }          from '../../../core/services/logger.service';
import { CloudinaryUrlPipe, CloudinarySrcsetPipe }
  from '../../pipes/cloudinary-url.pipe';

const PLACEHOLDER = 'assets/images/product-placeholder.svg';

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [CommonModule, CloudinaryUrlPipe, CloudinarySrcsetPipe],
  templateUrl: './product-card.html',
  styleUrl: './product-card.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductCardComponent {
  private readonly productService  = inject(ProductService);
  private readonly quickView       = inject(QuickViewService);
  readonly wishlist                = inject(WishlistService);
  private readonly recentlyViewed  = inject(RecentlyViewedService);
  private readonly platformId      = inject(PLATFORM_ID);
  private readonly logger          = inject(LoggerService);

  product = input.required<Product>();

  readonly imgError       = signal(false);
  readonly hoverImgError  = signal(false);
  readonly primaryLoaded  = signal(false);
  readonly isWishlisted   = computed(() => this.wishlist.has(this.product().id));

  readonly hoverImage = computed<string | null>(() => {
    const p = this.product();
    return p.hoverImage ?? p.gallery?.[0] ?? null;
  });

  readonly noHover = computed(() => {
    if (this.hoverImgError()) return true;
    return !this.hoverImage();
  });

  constructor() {
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

  onPrimaryLoad(): void {
    this.primaryLoaded.set(true);
  }

  onImgError(event: Event): void {
    const img = event.target as HTMLImageElement;
    this.logger.warn('[IMAGE] Cover image failed:', img.src);
    this.imgError.set(true);
  }

  onHoverImgError(event: Event): void {
    const img = event.target as HTMLImageElement;
    this.logger.warn('[IMAGE] Hover image failed:', img.src);
    this.hoverImgError.set(true);
  }
}
