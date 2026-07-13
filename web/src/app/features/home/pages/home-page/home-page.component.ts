import { Component, HostListener, inject, signal, PLATFORM_ID, OnInit } from '@angular/core';
import { CommonModule, isPlatformBrowser }                               from '@angular/common';
import { SCROLL_THRESHOLDS }                                             from '../../../../core/constants/app.constants';
import { SeoService }                                                    from '../../../../core/services/seo.service';

import { Hero }               from '../../../../components/hero/hero';
import { Categories }         from '../../../../components/categories/categories';
import { NewArrivals }        from '../../../../components/new-arrivals/new-arrivals';
import { TrendingProducts }   from '../../../../components/trending-products/trending-products';
import { CustomerLove }       from '../../../../components/customer-love/customer-love';
@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [
    CommonModule,
    Hero,
    Categories,
    NewArrivals,
    TrendingProducts,
    CustomerLove,
  ],
  templateUrl: './home-page.component.html',
  styleUrl: './home-page.component.css',
})
export class HomePageComponent implements OnInit {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly seo        = inject(SeoService);

  readonly showScrollTop = signal(false);

  ngOnInit(): void {
    this.seo.setPage({
      title:       'Premium Indian Ethnic Wear',
      description: 'Discover handpicked kurtas, kurta sets, sarees and more at Vrindaya. Timeless Indian ethnic wear with free delivery across India.',
      keywords:    ['ethnic wear online', 'kurta sets india', 'buy kurta online', 'indian women fashion'],
      url:         '/',
      jsonLd: {
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'Organization',
            '@id': 'https://vrindaya.in/#organization',
            'name': 'Vrindaya',
            'url': 'https://vrindaya.in',
            'logo': { '@type': 'ImageObject', 'url': 'https://vrindaya.in/assets/logo/vrindaya-logo.png' },
            'sameAs': ['https://www.instagram.com/vrindaya.co'],
          },
          {
            '@type': 'WebSite',
            '@id': 'https://vrindaya.in/#website',
            'url': 'https://vrindaya.in',
            'name': 'Vrindaya',
            'description': 'Premium Indian ethnic wear — handpicked kurtas, kurta sets, sarees and more.',
            'publisher': { '@id': 'https://vrindaya.in/#organization' },
          },
        ],
      },
    });
  }

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
