import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { BrandConfig } from '../../../../core/models/brand.model';
import { BrandService } from '../../../../core/services/brand.service';
import { SeoService } from '../../../../core/services/seo.service';

@Component({
  selector:        'app-about-page',
  standalone:      true,
  templateUrl:     './about-page.component.html',
  styleUrl:        './about-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AboutPageComponent implements OnInit {
  private readonly brandSvc = inject(BrandService);
  private readonly seo      = inject(SeoService);

  readonly brand   = signal<BrandConfig | null>(null);
  readonly loading = signal(true);
  readonly error   = signal<string | null>(null);

  ngOnInit(): void {
    void this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const brand = await this.brandSvc.getConfig();
      this.brand.set(brand);

      const heading = brand.aboutUs.heading || 'About Us';
      const description = brand.aboutUs.body?.slice(0, 160) || 'Learn more about Vrindaya — premium Indian ethnic wear, thoughtfully curated.';
      const sameAs = [brand.socialLinks.instagram, brand.socialLinks.flipkart].filter((v): v is string => !!v);

      this.seo.setPage({
        title: heading,
        description,
        url: '/about',
        image: brand.aboutUs.imageUrl,
        jsonLd: {
          '@context': 'https://schema.org',
          '@type': 'AboutPage',
          'name': heading,
          'url': 'https://vrindaya.in/about',
          'mainEntity': {
            '@type': 'Organization',
            'name': 'Vrindaya',
            'url': 'https://vrindaya.in',
            ...(sameAs.length ? { sameAs } : {}),
          },
        },
      });
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Could not load this page.');
    } finally {
      this.loading.set(false);
    }
  }
}
