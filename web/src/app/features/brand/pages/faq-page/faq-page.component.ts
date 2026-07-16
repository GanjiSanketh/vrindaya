import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ApiFaq } from '../../../../core/models/brand.model';
import { BrandService } from '../../../../core/services/brand.service';
import { SeoService } from '../../../../core/services/seo.service';

@Component({
  selector:        'app-faq-page',
  standalone:      true,
  templateUrl:     './faq-page.component.html',
  styleUrl:        './faq-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FaqPageComponent implements OnInit {
  private readonly brandSvc = inject(BrandService);
  private readonly seo      = inject(SeoService);

  readonly faqs        = signal<ApiFaq[]>([]);
  readonly loading      = signal(true);
  readonly error        = signal<string | null>(null);
  readonly openIds      = signal<Set<string>>(new Set());

  ngOnInit(): void {
    void this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const brand = await this.brandSvc.getConfig();
      const faqs = [...brand.faqs].sort((a, b) => a.displayOrder - b.displayOrder);
      this.faqs.set(faqs);

      this.seo.setPage({
        title: 'Frequently Asked Questions',
        description: 'Answers to common questions about Vrindaya, our products, and how to shop with us.',
        url: '/faq',
        jsonLd: faqs.length ? {
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          'mainEntity': faqs.map(f => ({
            '@type': 'Question',
            'name': f.question,
            'acceptedAnswer': { '@type': 'Answer', 'text': f.answer },
          })),
        } : undefined,
      });
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Could not load this page.');
    } finally {
      this.loading.set(false);
    }
  }

  isOpen(id: string): boolean {
    return this.openIds().has(id);
  }

  toggle(id: string): void {
    this.openIds.update(set => {
      const next = new Set(set);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }
}
