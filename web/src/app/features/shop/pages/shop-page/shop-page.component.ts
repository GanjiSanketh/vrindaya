import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';

import { ProductQueryService, PUBLIC_SORT_OPTIONS } from '../../../../core/services/product-query.service';
import { CategoryService } from '../../../../core/services/category.service';
import { SeoService } from '../../../../core/services/seo.service';
import { Category, Product } from '../../../../core/models/product.model';
import { ProductCard } from '../../../../shared/components/product-card/product-card';
import { SkeletonGridComponent } from '../../../../shared/components/skeleton/skeleton-grid.component';

const PAGE_SIZE = 24;

export type ShopFilterKind = 'none' | 'category' | 'availability' | 'featured' | 'bestSeller' | 'newArrival';
const SORT_OPTIONS = PUBLIC_SORT_OPTIONS;

@Component({
  selector: 'app-shop-page',
  standalone: true,
  imports: [RouterLink, ProductCard, SkeletonGridComponent],
  templateUrl: './shop-page.component.html',
  styleUrl: './shop-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShopPageComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly query = inject(ProductQueryService);
  private readonly categoryQuery = inject(CategoryService);
  private readonly seo = inject(SeoService);
  private querySub!: Subscription;

  readonly sortOptions = SORT_OPTIONS;
  readonly sortOptionKeys = Object.keys(SORT_OPTIONS) as (keyof typeof SORT_OPTIONS)[];
  readonly categories = signal<Category[]>([]);

  readonly searchTerm  = signal<string | null>(null);
  readonly filterKind  = signal<ShopFilterKind>('none');
  readonly categoryId  = signal('');
  readonly sortKey     = signal<keyof typeof SORT_OPTIONS>('displayOrder');

  readonly items       = signal<Product[]>([]);
  readonly nextCursor  = signal<string | null>(null);
  readonly loading     = signal(true);
  readonly loadingMore = signal(false);
  readonly error       = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    this.categories.set(await this.categoryQuery.getAll().catch(() => [] as Category[]));

    this.querySub = this.route.queryParamMap.subscribe(params => {
      const q = params.get('q');
      const presetFilter = params.get('filter') as ShopFilterKind | null;
      const presetCategory = params.get('category');

      this.searchTerm.set(q);

      if (!q) {
        if (presetCategory) {
          this.filterKind.set('category');
          this.categoryId.set(presetCategory);
        } else if (presetFilter && presetFilter !== 'none') {
          this.filterKind.set(presetFilter);
        } else {
          this.filterKind.set('none');
        }
      }

      void this.resetAndLoad();
      this.applySeo();
    });
  }

  ngOnDestroy(): void {
    this.querySub.unsubscribe();
  }

  private applySeo(): void {
    const q = this.searchTerm();
    const title = q ? `Search results for "${q}"` : 'Shop All Products';
    this.seo.setPage({
      title,
      description: q
        ? `Search results for "${q}" at Vrindaya — premium Indian ethnic wear.`
        : 'Browse the full Vrindaya catalogue — kurtas, kurta sets and more, filterable by category and availability.',
      url: '/shop',
    });
  }

  setFilter(kind: ShopFilterKind): void {
    if (this.searchTerm()) void this.clearSearch();
    this.filterKind.set(kind);
    if (kind !== 'category') this.categoryId.set('');
    void this.resetAndLoad();
  }

  setCategory(id: string): void {
    this.filterKind.set(id ? 'category' : 'none');
    this.categoryId.set(id);
    void this.resetAndLoad();
  }

  setSort(event: Event): void {
    this.sortKey.set((event.target as HTMLSelectElement).value as keyof typeof SORT_OPTIONS);
    void this.resetAndLoad();
  }

  clearSearch(): void {
    this.searchTerm.set(null);
    void this.router.navigate(['/shop']);
  }

  private async resetAndLoad(): Promise<void> {
    this.items.set([]);
    this.nextCursor.set(null);
    await this.load();
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const page = await this.fetchPage();
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
      const page = await this.fetchPage(cursor);
      this.items.update(list => [...list, ...page.items]);
      this.nextCursor.set(page.nextCursor);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Could not load more products.');
    } finally {
      this.loadingMore.set(false);
    }
  }

  private fetchPage(cursor?: string) {
    const q = this.searchTerm();
    if (q) {
      return this.query.search(q, PAGE_SIZE, cursor);
    }

    const sort = SORT_OPTIONS[this.sortKey()];
    switch (this.filterKind()) {
      case 'category':
        return this.query.browse({ category: this.categoryId() }, sort.sortBy, sort.sortDescending, PAGE_SIZE, cursor);
      case 'availability':
        return this.query.browse({ inStockOnly: true }, sort.sortBy, sort.sortDescending, PAGE_SIZE, cursor);
      case 'featured':
        return this.query.browse({ featured: true }, sort.sortBy, sort.sortDescending, PAGE_SIZE, cursor);
      case 'bestSeller':
        return this.query.browse({ bestSeller: true }, sort.sortBy, sort.sortDescending, PAGE_SIZE, cursor);
      case 'newArrival':
        return this.query.browse({ newArrival: true }, sort.sortBy, sort.sortDescending, PAGE_SIZE, cursor);
      default:
        return this.query.browse({}, sort.sortBy, sort.sortDescending, PAGE_SIZE, cursor);
    }
  }

  retry(): void {
    void this.load();
  }
}
