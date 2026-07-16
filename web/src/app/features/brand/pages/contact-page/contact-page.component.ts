import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { BrandConfig } from '../../../../core/models/brand.model';
import { BrandService } from '../../../../core/services/brand.service';
import { SeoService } from '../../../../core/services/seo.service';

@Component({
  selector:        'app-contact-page',
  standalone:      true,
  templateUrl:     './contact-page.component.html',
  styleUrl:        './contact-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContactPageComponent implements OnInit {
  private readonly brandSvc  = inject(BrandService);
  private readonly seo       = inject(SeoService);
  private readonly sanitizer = inject(DomSanitizer);

  readonly brand   = signal<BrandConfig | null>(null);
  readonly loading = signal(true);
  readonly error   = signal<string | null>(null);
  readonly mapUrl  = signal<SafeResourceUrl | null>(null);

  ngOnInit(): void {
    void this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const brand = await this.brandSvc.getConfig();
      this.brand.set(brand);
      if (brand.contact.mapEmbedUrl) {
        this.mapUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(brand.contact.mapEmbedUrl));
      }

      this.seo.setPage({
        title: 'Contact Us',
        description: 'Get in touch with Vrindaya — email, phone, WhatsApp, and store address.',
        url: '/contact',
        jsonLd: {
          '@context': 'https://schema.org',
          '@type': 'ContactPage',
          'name': 'Contact Vrindaya',
          'url': 'https://vrindaya.in/contact',
          'mainEntity': {
            '@type': 'Organization',
            'name': brand.storeInformation.legalName || 'Vrindaya',
            ...(brand.contact.email ? { email: brand.contact.email } : {}),
            ...(brand.contact.phone ? { telephone: brand.contact.phone } : {}),
            ...(brand.contact.address ? { address: brand.contact.address } : {}),
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
