import { Component, inject, signal, PLATFORM_ID, ChangeDetectionStrategy, DestroyRef, ElementRef, viewChild } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { fromEvent, animationFrameScheduler } from 'rxjs';
import { throttleTime } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SCROLL_THRESHOLDS } from '../../../../core/constants/app.constants';
import { SeoService } from '../../../../core/services/seo.service';
import { ProductService } from '../../../../core/services/product.service';
import { HeroBannerService } from '../../../../core/services/hero-banner.service';
import { HeroShowcaseService } from '../../../../core/services/hero-showcase.service';
import { AnalyticsService } from '../../../../core/analytics/analytics.service';
import { HeroSequenceComponent } from '../../components/hero-sequence/hero-sequence.component';
import { HeroShowcaseComponent } from '../../components/hero-showcase/hero-showcase.component';
import { PremiumFloatingCategoriesComponent } from '../../components/premium-floating-categories/premium-floating-categories.component';
import { PremiumProductShowcaseComponent } from '../../components/premium-product-showcase/premium-product-showcase.component';
import { RevealDirective } from '../../directives/reveal.directive';
import { NewArrivals } from '../../../../components/new-arrivals/new-arrivals';
import { TrendingProducts } from '../../../../components/trending-products/trending-products';
import { BestSellers } from '../../../../components/best-sellers/best-sellers';
import { CustomerLove } from '../../../../components/customer-love/customer-love';
import { SkeletonGridComponent } from '../../../../shared/components/skeleton/skeleton-grid.component';
import { CloudinaryUrlPipe, CloudinarySrcsetPipe } from '../../../../shared/pipes/cloudinary-url.pipe';

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [
    CommonModule, RouterLink,
    HeroSequenceComponent,
    HeroShowcaseComponent,
    PremiumFloatingCategoriesComponent,
    PremiumProductShowcaseComponent,
    RevealDirective,
    NewArrivals, TrendingProducts, BestSellers, CustomerLove,
    SkeletonGridComponent,
    CloudinaryUrlPipe, CloudinarySrcsetPipe,
  ],
  templateUrl: './home-page.component.html',
  styleUrl: './home-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePageComponent {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly seo = inject(SeoService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly el = inject(ElementRef);
  readonly productSvc = inject(ProductService);
  private readonly heroBanner = inject(HeroBannerService);
  private readonly heroShowcaseSvc = inject(HeroShowcaseService);
  private readonly analytics = inject(AnalyticsService);

  readonly showScrollTop = signal(false);
  readonly heroLoaded = signal(false);
  readonly mouseX = signal(0);
  readonly mouseY = signal(0);

  /**
   * Hero resolution (most-specific first):
   *   1. Premium Product Showcase / Floating Categories — legacy premium hero
   *      experiments, kept intact and switchable at any time.
   *   2. Hero Showcase — the CMS-driven hero (homepageConfig/active) rendered
   *      whenever it is enabled and has at least one enabled item.
   *   3. Hero Banner — the classic Firestore-driven banner, the fallback when
   *      the Hero Showcase is disabled (backward compatibility, never deleted).
   */
  readonly usePremiumHero = signal(false);
  readonly useProductShowcase = signal(false);

  /** The persisted Hero Showcase configuration + whether it is live. */
  readonly heroShowcaseConfig = this.heroShowcaseSvc.config;
  readonly heroShowcaseEnabled = this.heroShowcaseSvc.enabled;

  protected readonly heroSequence = viewChild.required(HeroSequenceComponent);

  /** Wide/narrow banner URLs from the Firestore-driven HeroBannerService (asset fallback until/unless published). */
  readonly heroDesktop = this.heroBanner.desktopSrc;
  readonly heroMobile = this.heroBanner.mobileSrc;

  readonly categories = this.productSvc.categories;
  readonly categoriesLoading = this.productSvc.categoriesLoading;
  readonly newArrivals = this.productSvc.newArrivals;
  readonly trending = this.productSvc.trending;
  readonly bestSellers = this.productSvc.bestSellers;
  readonly features = this.productSvc.features;
  readonly loading = this.productSvc.loading;

  constructor() {
    this.seo.setPage({
      title: 'Vrindaya — Wear The Grace',
      description: 'Discover timeless ethnic wear at Vrindaya. Shop kurtas, kurta sets, and more. Premium fabrics, elegant designs, pan India delivery.',
      keywords: ['ethnic wear', 'kurtas', 'kurta sets', 'indian fashion', 'vrindaya', 'women ethnic wear'],
      url: '/',
      jsonLd: {
        '@type': 'WebPage',
        'name': 'Vrindaya — Wear The Grace',
        'url': 'https://vrindaya.in/',
        'description': 'Discover timeless ethnic wear at Vrindaya. Shop kurtas, kurta sets, and more.',
      },
    });
    void this.productSvc.ensureHomeDataLoaded();

    if (isPlatformBrowser(this.platformId)) {
      void this.heroBanner.ensureLoaded();
      void this.heroShowcaseSvc.ensureLoaded();
      this.initScrollHandler();
      this.initMouseParallax();
    }
  }

  onHeroLoaded(): void {
    this.heroLoaded.set(true);
  }

  trackHero(label: string): void {
    this.analytics.trackHeroClick(label);
  }

  trackCategoryClick(id: string): void {
    this.analytics.trackCategoryClick(id);
  }

  trackCollection(id: string): void {
    this.analytics.trackCollectionClick(id);
  }

  private initScrollHandler(): void {
    fromEvent(window, 'scroll').pipe(
      throttleTime(0, animationFrameScheduler),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(() => {
      this.showScrollTop.set(window.scrollY > SCROLL_THRESHOLDS.SCROLL_TOP);
      const hero = this.el.nativeElement.querySelector('.hero-section') as HTMLElement;
      if (!hero) return;
      const bg = hero.querySelector('.hero-sequence-container') as HTMLElement;
      if (!bg) return;
      const rect = hero.getBoundingClientRect();
      const viewportH = window.innerHeight;
      const heroH = rect.height;
      const progress = Math.max(0, Math.min(1, (viewportH - rect.top) / (viewportH + heroH)));
      bg.style.transform = `translate3d(0, ${progress * 12}px, 0)`;
    });
  }

  private initMouseParallax(): void {
    const hero = this.el.nativeElement.querySelector('.hero-section') as HTMLElement;
    if (!hero) return;

    let ticking = false;
    const onMouseMove = (e: MouseEvent) => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const rect = hero.getBoundingClientRect();
          const x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
          const y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
          this.applyParallax(hero, x, y);
          ticking = false;
        });
        ticking = true;
      }
    };
    const onMouseLeave = () => {
      this.applyParallax(hero, 0, 0);
    };

    hero.addEventListener('mousemove', onMouseMove, { passive: true });
    hero.addEventListener('mouseleave', onMouseLeave, { passive: true });

    this.destroyRef.onDestroy(() => {
      hero.removeEventListener('mousemove', onMouseMove);
      hero.removeEventListener('mouseleave', onMouseLeave);
    });
  }

  private applyParallax(container: HTMLElement, x: number, y: number): void {
    const contentInner = container.querySelector('.hero-content-inner') as HTMLElement;
    if (contentInner) {
      contentInner.style.transform = `translate3d(${x * -8}px, ${y * -4}px, 0)`;
    }

    const gradient = container.querySelector('.hero-gradient') as HTMLElement;
    if (gradient) {
      gradient.style.transform = `translate3d(${x * 6}px, ${y * 3}px, 0)`;
    }
  }

  scrollToTop(): void {
    if (isPlatformBrowser(this.platformId)) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }
}
