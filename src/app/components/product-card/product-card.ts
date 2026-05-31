import { Component, inject, input, signal, OnDestroy, PLATFORM_ID, computed } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { Product } from '../../models/product.model';
import { ProductService } from '../../shared/product.service';
import { WishlistService } from '../../shared/wishlist.service';

const CYCLE_MS = 1600;

@Component({
  selector: 'app-product-card',
  imports: [CommonModule],
  templateUrl: './product-card.html',
  styleUrl: './product-card.css',
})
export class ProductCard implements OnDestroy {
  private productService = inject(ProductService);
  private wishlistService = inject(WishlistService);
  private platformId = inject(PLATFORM_ID);

  product = input.required<Product>();

  readonly activeImageIndex = signal(0);
  readonly isHovered = signal(false);
  /** True when the currently displayed image fails to load */
  readonly imageError = signal(false);

  private cycleTimer: ReturnType<typeof setInterval> | null = null;

  /* ── Image helpers ── */
  get images(): string[] {
    const imgs = this.product().images;
    return imgs && imgs.length > 0 ? imgs : [this.product().image];
  }

  get activeImage(): string {
    return this.images[this.activeImageIndex()] ?? this.product().image;
  }

  get hasMultipleImages(): boolean {
    return this.images.length > 1;
  }

  get dotImages(): string[] {
    return this.images.slice(0, 5);
  }

  get showProgressBar(): boolean {
    return this.images.length > 5;
  }

  /* ── Rating ── */
  get fullStars(): number {
    return Math.floor(this.product().rating ?? 0);
  }

  get halfStar(): boolean {
    return (this.product().rating ?? 0) % 1 >= 0.5;
  }

  readonly stars = [1, 2, 3, 4, 5];

  /* ── Wishlist ── */
  readonly isWishlisted = computed(() => this.wishlistService.has(this.product().id));

  toggleWishlist(event: Event): void {
    this.wishlistService.toggle(this.product().id, event);
  }

  /* ── Hover / image cycling ── */
  onCardHover(): void {
    this.isHovered.set(true);
    if (!this.hasMultipleImages || !isPlatformBrowser(this.platformId)) return;
    this.goToImage(1 % this.images.length);
    this.cycleTimer = setInterval(() => {
      this.goToImage((this.activeImageIndex() + 1) % this.images.length);
    }, CYCLE_MS);
  }

  onCardLeave(): void {
    this.isHovered.set(false);
    this.goToImage(0);
    this.clearCycle();
  }

  setImage(index: number): void {
    this.goToImage(index);
    this.clearCycle();
    if (!isPlatformBrowser(this.platformId)) return;
    this.cycleTimer = setInterval(() => {
      this.goToImage((this.activeImageIndex() + 1) % this.images.length);
    }, CYCLE_MS);
  }

  /**
   * Central method that changes the active image index and resets the error
   * state so the new image gets a fresh load attempt.
   */
  private goToImage(index: number): void {
    if (index !== this.activeImageIndex()) {
      this.imageError.set(false); // reset error for the new image
    }
    this.activeImageIndex.set(index);
  }

  /**
   * Called when an <img> fails to load.
   * Instead of falling back to a random placeholder, we show a
   * branded "Image Coming Soon" block.
   */
  handleImageError(): void {
    this.imageError.set(true);
  }

  openProduct(event: Event): void {
    event.preventDefault();
    this.productService.openProduct(this.product());
  }

  ngOnDestroy(): void {
    this.clearCycle();
  }

  private clearCycle(): void {
    if (this.cycleTimer) {
      clearInterval(this.cycleTimer);
      this.cycleTimer = null;
    }
  }
}
