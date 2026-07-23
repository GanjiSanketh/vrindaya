import { Component, HostListener, inject, signal, PLATFORM_ID, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { SCROLL_THRESHOLDS } from '../../../../core/constants/app.constants';
import { SeoService } from '../../../../core/services/seo.service';
import { SkeletonGridComponent } from '../../../../shared/components/skeleton/skeleton-grid.component';

import { NewArrivals }      from '../../../../components/new-arrivals/new-arrivals';
import { TrendingProducts } from '../../../../components/trending-products/trending-products';
import { BestSellers }      from '../../../../components/best-sellers/best-sellers';
import { CustomerLove }     from '../../../../components/customer-love/customer-love';

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [
    CommonModule,
    SkeletonGridComponent,
    NewArrivals,
    TrendingProducts,
    BestSellers,
    CustomerLove,
  ],
  templateUrl: './home-page.component.html',
  styleUrl: './home-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePageComponent {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly seo        = inject(SeoService);

  readonly showScrollTop = signal(false);

  @HostListener('window:scroll')
  onScroll(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.showScrollTop.set(window.scrollY > SCROLL_THRESHOLDS.SCROLL_TOP);
    }
  }

  scrollToTop(): void {
    if (isPlatformBrowser(this.platformId)) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }
}
