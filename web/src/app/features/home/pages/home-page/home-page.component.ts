import { Component, HostListener, inject, signal, PLATFORM_ID, OnInit } from '@angular/core';
import { CommonModule, isPlatformBrowser }                               from '@angular/common';
import { SCROLL_THRESHOLDS }                                             from '../../../../core/constants/app.constants';
import { SeoService }                                                    from '../../../../core/services/seo.service';
import { HomepageService }                                               from '../../../../core/services/homepage.service';
import { Homepage }                                                      from '../../../../core/models/homepage.model';
import { SkeletonGridComponent }                                         from '../../../../shared/components/skeleton/skeleton-grid.component';

import { Hero }                       from '../../../../components/hero/hero';
import { Categories }                 from '../../../../components/categories/categories';
import { NewArrivals }                from '../../../../components/new-arrivals/new-arrivals';
import { TrendingProducts }           from '../../../../components/trending-products/trending-products';
import { BestSellers }                from '../../../../components/best-sellers/best-sellers';
import { CustomerLove }               from '../../../../components/customer-love/customer-love';
import { AnnouncementBannerComponent } from '../../../../components/announcement-banner/announcement-banner';
import { PromotionalBannerComponent }  from '../../../../components/promotional-banner/promotional-banner';
import { InstagramSectionComponent }   from '../../../../components/instagram-section/instagram-section';
import { FooterBannerComponent }       from '../../../../components/footer-banner/footer-banner';

const FALLBACK_SEO = {
  title:       'Premium Indian Ethnic Wear',
  description: 'Discover handpicked kurtas, kurta sets, sarees and more at Vrindaya. Timeless Indian ethnic wear with free delivery across India.',
  keywords:    ['ethnic wear online', 'kurta sets india', 'buy kurta online', 'indian women fashion'],
};

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [
    CommonModule,
    SkeletonGridComponent,
    AnnouncementBannerComponent,
    Hero,
    Categories,
    PromotionalBannerComponent,
    NewArrivals,
    TrendingProducts,
    BestSellers,
    InstagramSectionComponent,
    CustomerLove,
    FooterBannerComponent,
  ],
  templateUrl: './home-page.component.html',
  styleUrl: './home-page.component.css',
})
export class HomePageComponent implements OnInit {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly seo        = inject(SeoService);
  private readonly homepageSvc = inject(HomepageService);

  readonly showScrollTop = signal(false);

  readonly homepage = signal<Homepage | null>(null);
  readonly loading  = signal(true);
  readonly error    = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const hp = await this.homepageSvc.getHomepage();
      this.homepage.set(hp);
      this.applySeo(hp);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Could not load the homepage.');
    } finally {
      this.loading.set(false);
    }
  }

  retry(): void {
    void this.load();
  }

  private applySeo(hp: Homepage): void {
    this.seo.setPage({
      title:       hp.seo.metaTitle || FALLBACK_SEO.title,
      description: hp.seo.metaDescription || FALLBACK_SEO.description,
      keywords:    hp.seo.metaKeywords.length ? hp.seo.metaKeywords : FALLBACK_SEO.keywords,
      url:         hp.seo.canonicalUrl || '/',
      image:       hp.seo.ogImage,
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
