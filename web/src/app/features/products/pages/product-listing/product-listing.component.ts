import { Component, inject, signal, ChangeDetectionStrategy, DestroyRef, afterNextRender, ElementRef, viewChild } from '@angular/core';
import { ActivatedRoute, RouterLink }                             from '@angular/router';
import { switchMap, distinctUntilChanged }                        from 'rxjs';
import { takeUntilDestroyed }                                     from '@angular/core/rxjs-interop';
import { ProductQueryService, PUBLIC_SORT_OPTIONS }               from '../../../../core/services/product-query.service';
import { CategoryService }                                        from '../../../../core/services/category.service';
import { Category, Product }                                      from '../../../../core/models/product.model';
import { ProductCardComponent }                                            from '../../../../shared/components/product-card/product-card';
import { SkeletonGridComponent }                                  from '../../../../shared/components/skeleton/skeleton-grid.component';
import { SeoService }                                             from '../../../../core/services/seo.service';
import { CloudinaryUrlPipe, CloudinarySrcsetPipe }                from '../../../../shared/pipes/cloudinary-url.pipe';

const PAGE_SIZE = 24;
const SORT_OPTIONS = PUBLIC_SORT_OPTIONS;

@Component({
  selector: 'app-product-listing',
  standalone: true,
  imports: [RouterLink, ProductCardComponent, SkeletonGridComponent, CloudinaryUrlPipe, CloudinarySrcsetPipe],
  templateUrl: './product-listing.component.html',
  styleUrl: './product-listing.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductListingComponent {
  private readonly route  = inject(ActivatedRoute);
  private readonly categoryQuery = inject(CategoryService);
  private readonly query  = inject(ProductQueryService);
  private readonly seo    = inject(SeoService);

  readonly categoryId = signal('');
  readonly sortOptions = SORT_OPTIONS;
  readonly sortOptionKeys = Object.keys(SORT_OPTIONS) as (keyof typeof SORT_OPTIONS)[];
  readonly sortKey     = signal<keyof typeof SORT_OPTIONS>('displayOrder');
  readonly category    = signal<Category | undefined>(undefined);

  readonly items       = signal<Product[]>([]);
  readonly nextCursor  = signal<string | null>(null);
  readonly loading     = signal(true);
  readonly loadingMore = signal(false);
  readonly error       = signal<string | null>(null);

  readonly products = this.items;

  private readonly destroyRef = inject(DestroyRef);
  readonly sentinelEl = viewChild<ElementRef<HTMLElement>>('sentinel');

  constructor() {
    this.route.paramMap.pipe(
      distinctUntilChanged((a, b) => a.get('id') === b.get('id')),
      switchMap(async params => {
        const id = params.get('id') ?? '';
        const categories = await this.categoryQuery.getAll().catch(() => [] as Category[]);
        const cat = categories.find(c => c.id === id);
        if (!cat) return;
        return { id, cat };
      }),
      takeUntilDestroyed(),
    ).subscribe(async result => {
      if (!result) return;
      const { id, cat } = result;
      this.categoryId.set(id);
      this.category.set(cat);
      this.sortKey.set('displayOrder');
      await this.load();

      this.seo.setPage({
        title:       cat.seoTitle || cat.name,
        description: cat.seoDescription || cat.description || `Shop premium ${cat.name} at Vrindaya. ${cat.subtitle}. Free delivery across India.`,
        keywords:    cat.seoKeywords?.length ? cat.seoKeywords : [cat.name.toLowerCase(), cat.id.replace(/-/g, ' '), 'ethnic wear', 'buy online india'],
        url:         `/category/${id}`,
        image:       cat.bannerImage || cat.image,
        jsonLd: [
          {
            '@type': 'CollectionPage',
            'name': cat.name,
            'url': `https://vrindaya.in/category/${id}`,
            'description': cat.description || `Shop ${cat.name} — ${cat.subtitle} at Vrindaya`,
            'isPartOf': { '@type': 'WebSite', 'url': 'https://vrindaya.in' },
          },
          this.seo.breadcrumb([
            { name: 'Home', url: '/' },
            { name: cat.name, url: `/category/${id}` },
          ]),
        ],
      });
    });

    if (typeof window !== 'undefined') {
      afterNextRender(() => {
        const sentinel = this.sentinelEl()?.nativeElement;
        if (!sentinel) return;
        const observer = new IntersectionObserver(
          entries => {
            if (entries[0]?.isIntersecting && this.nextCursor() && !this.loadingMore()) {
              void this.loadMore();
            }
          },
          { rootMargin: '400px' },
        );
        observer.observe(sentinel);
        this.destroyRef.onDestroy(() => observer.disconnect());
      });
    }
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const sort = SORT_OPTIONS[this.sortKey()];
      const page = await this.query.getByCategory(this.categoryId(), PAGE_SIZE, undefined, sort.sortBy, sort.sortDescending);
      this.items.set(page.items);
      this.nextCursor.set(page.nextCursor);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Could not load products.');
    } finally {
      this.loading.set(false);
    }
  }

  async loadMore(): Promise<void> {
    const cursor = this.nextCursor();
    if (!cursor || this.loadingMore()) return;

    this.loadingMore.set(true);
    try {
      const sort = SORT_OPTIONS[this.sortKey()];
      const page = await this.query.getByCategory(this.categoryId(), PAGE_SIZE, cursor, sort.sortBy, sort.sortDescending);
      this.items.update(list => [...list, ...page.items]);
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

  setSort(event: Event): void {
    this.sortKey.set((event.target as HTMLSelectElement).value as keyof typeof SORT_OPTIONS);
    void this.load();
  }
}
