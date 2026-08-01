import {
  Component, inject, signal, computed,
  ChangeDetectionStrategy, PLATFORM_ID, ElementRef, DestroyRef, AfterViewInit,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { interval } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Product } from '../../../../core/models/product.model';
import { ProductService } from '../../../../core/services/product.service';
import { CloudinaryUrlPipe, CloudinarySrcsetPipe } from '../../../../shared/pipes/cloudinary-url.pipe';

const IMAGE_FALLBACK = 'assets/images/product-placeholder.svg';

/** Optional enhancement: rotate featured products every 8s with a fade transition. */
const ROTATE_MS = 8000;
/** Rotation pool is capped so the hero stays curated, never a full slideshow. */
const MAX_ROTATION_POOL = 8;
/** Mouse tilt limits — spec: 6deg rotation, 20px movement. */
const MAX_ROTATION_DEG = 6;
const MAX_TRANSLATE_PX = 20;

@Component({
  selector: 'app-premium-product-showcase',
  standalone: true,
  imports: [RouterLink, CloudinaryUrlPipe, CloudinarySrcsetPipe],
  templateUrl: './premium-product-showcase.component.html',
  styleUrl: './premium-product-showcase.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PremiumProductShowcaseComponent implements AfterViewInit {
  private readonly productSvc = inject(ProductService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly el = inject(ElementRef);
  private readonly destroyRef = inject(DestroyRef);

  /** Index into the showcase pool — advances automatically when >1 featured product exists. */
  readonly index = signal(0);
  /** True while the pointer rests over the showcase — pauses auto-rotation. */
  readonly paused = signal(false);

  /**
   * Product selection, reusing existing ProductService data with zero logic
   * duplication: Featured → New Arrival → Best Seller → first available.
   */
  readonly pool = computed<Product[]>(() => {
    const featured = this.productSvc.trending();
    if (featured.length) return featured.slice(0, MAX_ROTATION_POOL);
    const fresh = this.productSvc.newArrivals();
    if (fresh.length) return [fresh[0]];
    const best = this.productSvc.bestSellers();
    if (best.length) return [best[0]];
    return this.productSvc.allProducts.slice(0, 1);
  });

  /** The currently displayed product. */
  readonly product = computed<Product | null>(() => {
    const list = this.pool();
    if (!list.length) return null;
    return list[this.index() % list.length] ?? null;
  });

  /**
   * Single-item list keyed by product id — Angular rebuilds the card when the
   * key changes, which re-triggers the fade-in CSS animation on rotation.
   */
  readonly displayList = computed<Product[]>(() => {
    const p = this.product();
    return p ? [p] : [];
  });

  readonly rotates = computed(() => this.pool().length > 1);
  readonly loading = this.productSvc.loading;

  /** Existing primary image — same resolution logic as the product card. */
  readonly image = computed(() => {
    const p = this.product();
    if (!p) return IMAGE_FALLBACK;
    return p.image?.trim() || p.thumbnailUrl?.trim() || IMAGE_FALLBACK;
  });

  readonly categoryName = computed(() => {
    const p = this.product();
    if (!p?.category) return '';
    return this.productSvc.categories().find(c => c.id === p.category)?.name ?? '';
  });

  /** Reuses existing routing: the product's collection, falling back to the shop. */
  readonly viewLink = computed(() => {
    const p = this.product();
    return p?.category ? ['/category', p.category] : ['/shop'];
  });

  constructor() {
    // No-op after the first caller (home page already triggers this).
    void this.productSvc.ensureHomeDataLoaded();

    if (isPlatformBrowser(this.platformId)) {
      interval(ROTATE_MS).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.advance());
    }
  }

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.initShowcaseMotion();
    }
  }

  private advance(): void {
    if (this.paused() || !this.rotates()) return;
    const len = this.pool().length;
    if (len < 2) return;
    this.index.update(i => (i + 1) % len);
  }

  /** Mouse tilt (rotateX/Y, translate) + pause-on-hover. Transform-only, rAF-throttled. */
  private initShowcaseMotion(): void {
    const section = this.el.nativeElement.querySelector('.pis-hero') as HTMLElement | null;
    const tilt = this.el.nativeElement.querySelector('.pis-tilt') as HTMLElement | null;
    const stage = this.el.nativeElement.querySelector('.pis-stage') as HTMLElement | null;
    if (!section || !tilt) return;

    const reduceMotion = typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let ticking = false;
    const onMouseMove = (e: MouseEvent) => {
      if (reduceMotion) return;
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const rect = section.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
        const y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
        tilt.style.transform =
          `rotateY(${(x * MAX_ROTATION_DEG).toFixed(2)}deg) ` +
          `rotateX(${(y * MAX_ROTATION_DEG).toFixed(2)}deg) ` +
          `translate3d(${(x * MAX_TRANSLATE_PX).toFixed(2)}px, ${(y * MAX_TRANSLATE_PX).toFixed(2)}px, 0)`;
        ticking = false;
      });
    };

    const onMouseLeave = () => {
      if (reduceMotion) return;
      tilt.style.transform = 'rotateY(0deg) rotateX(0deg) translate3d(0, 0, 0)';
    };

    const onStageEnter = () => this.paused.set(true);
    const onStageLeave = () => this.paused.set(false);

    section.addEventListener('mousemove', onMouseMove, { passive: true });
    section.addEventListener('mouseleave', onMouseLeave, { passive: true });
    stage?.addEventListener('mouseenter', onStageEnter, { passive: true });
    stage?.addEventListener('mouseleave', onStageLeave, { passive: true });

    this.destroyRef.onDestroy(() => {
      section.removeEventListener('mousemove', onMouseMove);
      section.removeEventListener('mouseleave', onMouseLeave);
      stage?.removeEventListener('mouseenter', onStageEnter);
      stage?.removeEventListener('mouseleave', onStageLeave);
    });
  }
}
