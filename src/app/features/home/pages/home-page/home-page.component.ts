import { Component, HostListener, inject, signal, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser }                       from '@angular/common';
import { SCROLL_THRESHOLDS, SOCIAL_LINKS }                       from '../../../../core/constants/app.constants';

import { Hero }              from '../../../../components/hero/hero';
import { NewArrivalsBanner } from '../../../../components/new-arrivals-banner/new-arrivals-banner.component';
import { Categories }        from '../../../../components/categories/categories';
import { NewArrivals }       from '../../../../components/new-arrivals/new-arrivals';
import { CustomerLove }      from '../../../../components/customer-love/customer-love';

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [CommonModule, Hero, NewArrivalsBanner, Categories, NewArrivals, CustomerLove],
  templateUrl: './home-page.component.html',
  styleUrl: './home-page.component.css',
})
export class HomePageComponent {
  private readonly platformId = inject(PLATFORM_ID);

  readonly showScrollTop  = signal(false);
  readonly instagramUrl   = SOCIAL_LINKS.INSTAGRAM;

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
