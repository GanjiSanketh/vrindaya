import { ChangeDetectionStrategy, Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { CollectionService } from '../../../../core/services/collection.service';
import { CollectionLanding } from '../../../../core/models/collection.model';
import { ProductCard } from '../../../../shared/components/product-card/product-card';
import { SkeletonGridComponent } from '../../../../shared/components/skeleton/skeleton-grid.component';
import { SeoService } from '../../../../core/services/seo.service';

/**
 * The collection landing page — structurally mirrors ProductListingComponent
 * (loading/error/skeleton, SEO with JSON-LD, canonical URL) minus pagination
 * (a Collection is a bounded, admin-curated list — the full resolved set
 * renders at once, no Load More) and minus the sort dropdown (no sort
 * concept for a curated list). OnPush since this is a new component with no
 * existing change-detection convention to preserve.
 */
@Component({
  selector:          'app-collection-listing',
  standalone:        true,
  imports:           [RouterLink, ProductCard, SkeletonGridComponent],
  templateUrl:       './collection-listing.component.html',
  styleUrl:          './collection-listing.component.css',
  changeDetection:   ChangeDetectionStrategy.OnPush,
})
export class CollectionListingComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly collectionSvc = inject(CollectionService);
  private readonly seo = inject(SeoService);
  private paramSub!: Subscription;

  readonly collection = signal<CollectionLanding | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.paramSub = this.route.paramMap.subscribe(params => {
      const slug = params.get('slug') ?? '';
      void this.load(slug);
    });
  }

  ngOnDestroy(): void { this.paramSub.unsubscribe(); }

  private async load(slug: string): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const collection = await this.collectionSvc.getBySlug(slug);
      this.collection.set(collection);

      this.seo.setPage({
        title:       collection.seoTitle || collection.name,
        description: collection.seoDescription || `Shop the ${collection.name} collection at Vrindaya. Free delivery across India.`,
        keywords:    collection.seoKeywords.length ? collection.seoKeywords : [collection.name.toLowerCase(), 'ethnic wear', 'buy online india'],
        url:         `/collection/${slug}`,
        image:       collection.bannerImage || collection.image,
        jsonLd: {
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          'name': collection.name,
          'url': `https://vrindaya.in/collection/${slug}`,
          'description': collection.description || `Shop the ${collection.name} collection at Vrindaya`,
          'isPartOf': { '@type': 'WebSite', 'url': 'https://vrindaya.in' },
        },
      });
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Could not load this collection.');
    } finally {
      this.loading.set(false);
    }
  }

  retry(): void {
    const slug = this.route.snapshot.paramMap.get('slug') ?? '';
    void this.load(slug);
  }
}
