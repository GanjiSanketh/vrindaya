import { Component, inject, OnInit, PLATFORM_ID, signal, ChangeDetectionStrategy } from '@angular/core';
import { isPlatformBrowser }                                 from '@angular/common';
import { RouterLink }                                        from '@angular/router';
import { ProductQueryService }                               from '../../../../core/services/product-query.service';
import { Product }                                           from '../../../../core/models/product.model';
import { ProductCard }                                       from '../../../../shared/components/product-card/product-card';
import { SkeletonGridComponent }                             from '../../../../shared/components/skeleton/skeleton-grid.component';
import { SeoService }                                        from '../../../../core/services/seo.service';

const PAGE_SIZE = 24;

@Component({
  selector: 'app-trending-page',
  standalone: true,
  imports: [RouterLink, ProductCard, SkeletonGridComponent],
  templateUrl: './trending-page.component.html',
  styleUrl: './trending-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrendingPageComponent implements OnInit {
  private readonly query      = inject(ProductQueryService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly seo        = inject(SeoService);

  readonly products    = signal<Product[]>([]);
  readonly nextCursor  = signal<string | null>(null);
  readonly loading     = signal(true);
  readonly loadingMore = signal(false);
  readonly error       = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    this.seo.setPage({
      title:       'Trending Ethnic Wear',
      description: 'Discover the most popular Indian ethnic wear at Vrindaya. Trending kurtas and sets loved by women across India. Free delivery.',
      keywords:    ['trending ethnic wear', 'popular kurtas', 'bestselling kurta', 'most loved ethnic wear'],
      url:         '/trending',
    });
    if (isPlatformBrowser(this.platformId)) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    await this.load();
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const page = await this.query.getFeatured(PAGE_SIZE);
      this.products.set(page.items);
      this.nextCursor.set(page.nextCursor);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Could not load trending products.');
    } finally {
      this.loading.set(false);
    }
  }

  async loadMore(): Promise<void> {
    const cursor = this.nextCursor();
    if (!cursor || this.loadingMore()) return;

    this.loadingMore.set(true);
    try {
      const page = await this.query.getFeatured(PAGE_SIZE, cursor);
      this.products.update(list => [...list, ...page.items]);
      this.nextCursor.set(page.nextCursor);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Could not load more products.');
    } finally {
      this.loadingMore.set(false);
    }
  }

  retry(): void {
    void this.load();
  }
}
