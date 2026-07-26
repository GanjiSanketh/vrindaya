import { Component, HostListener, inject, signal, PLATFORM_ID, ChangeDetectionStrategy, type OnDestroy } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { SCROLL_THRESHOLDS } from '../../../../core/constants/app.constants';
import { SeoService } from '../../../../core/services/seo.service';
import { ProductService } from '../../../../core/services/product.service';
import { HeroSequenceComponent } from '../../components/hero-sequence/hero-sequence.component';
import { RevealDirective } from '../../directives/reveal.directive';
import { NewArrivals } from '../../../../components/new-arrivals/new-arrivals';
import { TrendingProducts } from '../../../../components/trending-products/trending-products';
import { BestSellers } from '../../../../components/best-sellers/best-sellers';
import { CustomerLove } from '../../../../components/customer-love/customer-love';

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [
    CommonModule, RouterLink,
    HeroSequenceComponent,
    RevealDirective,
    NewArrivals, TrendingProducts, BestSellers, CustomerLove,
  ],
  templateUrl: './home-page.component.html',
  styleUrl: './home-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePageComponent implements OnDestroy {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly seo = inject(SeoService);
  readonly productSvc = inject(ProductService);
  private parallaxRAF: number | null = null;

  readonly showScrollTop = signal(false);

  readonly categories = this.productSvc.categories;
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
    });
  }

  @HostListener('window:scroll')
  onScroll(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.showScrollTop.set(window.scrollY > SCROLL_THRESHOLDS.SCROLL_TOP);
      this.updateParallax();
    }
  }

  private updateParallax(): void {
    if (this.parallaxRAF !== null) cancelAnimationFrame(this.parallaxRAF);
    this.parallaxRAF = requestAnimationFrame(() => {
      const hero = document.querySelector('.hero-section');
      if (!hero) return;
      const bg = hero.querySelector('.hero-sequence-container') as HTMLElement;
      if (!bg) return;
      const rect = hero.getBoundingClientRect();
      const viewportH = window.innerHeight;
      const heroH = rect.height;
      const progress = Math.max(0, Math.min(1, (viewportH - rect.top) / (viewportH + heroH)));
      const translateY = progress * 12;
      bg.style.transform = `translateY(${translateY}px)`;
    });
  }

  scrollToTop(): void {
    if (isPlatformBrowser(this.platformId)) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  ngOnDestroy(): void {
    if (this.parallaxRAF !== null) cancelAnimationFrame(this.parallaxRAF);
  }
}
