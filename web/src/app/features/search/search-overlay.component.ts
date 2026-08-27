import {
  Component, effect, HostListener, inject,
  PLATFORM_ID, signal, ChangeDetectionStrategy,
} from '@angular/core';
import { isPlatformBrowser }               from '@angular/common';
import { FormsModule }                     from '@angular/forms';
import { Router }                          from '@angular/router';
import { Subject }                         from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { takeUntilDestroyed }              from '@angular/core/rxjs-interop';

import { SearchService }       from '../../core/services/search.service';
import { ProductQueryService } from '../../core/services/product-query.service';
import { CategoryService }     from '../../core/services/category.service';
import { AnalyticsService }    from '../../core/analytics/analytics.service';
import { Product, Category }   from '../../core/models/product.model';
import { CloudinaryUrlPipe }   from '../../shared/pipes/cloudinary-url.pipe';
import { RouterLink }          from '@angular/router';

export type SearchResultItem =
  | { kind: 'product'; product: Product }
  | { kind: 'category'; category: Category };

const MAX_CATEGORY_MATCHES = 3;
const MAX_PRODUCT_MATCHES = 8;

@Component({
  selector: 'app-search-overlay',
  standalone: true,
  imports: [FormsModule, CloudinaryUrlPipe, RouterLink],
  templateUrl: './search-overlay.component.html',
  styleUrl:    './search-overlay.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchOverlayComponent {
  readonly svc     = inject(SearchService);
  private readonly productQuery    = inject(ProductQueryService);
  private readonly categoryQuery   = inject(CategoryService);
  private readonly analytics = inject(AnalyticsService);
  private readonly router  = inject(Router);
  private readonly pid     = inject(PLATFORM_ID);

  readonly query   = signal('');
  readonly results = signal<SearchResultItem[]>([]);
  readonly loading = signal(false);
  readonly error   = signal<string | null>(null);

  readonly hints = ['Floral', 'Indigo', '3-Piece', 'Kurta Set', 'Embroidered', 'Pastel'];
  readonly recentSearches = signal<string[]>([]);

  private readonly query$ = new Subject<string>();
  private readonly RECENT_SEARCHES_KEY = 'vrindaya_recent_searches';
  private readonly MAX_RECENT = 5;

  constructor() {
    this.query$.pipe(
      debounceTime(250),
      distinctUntilChanged(),
      takeUntilDestroyed(),
    ).subscribe(q => this.runSearch(q));

    effect(() => {
      const open = this.svc.isOpen();
      if (isPlatformBrowser(this.pid)) {
        document.body.style.overflow = open ? 'hidden' : '';
        if (open) {
          this.loadRecentSearches();
          setTimeout(() => {
            (document.querySelector('.so-input') as HTMLInputElement)?.focus();
          }, 60);
        }
      }
    });
  }

  @HostListener('document:keydown.escape')
  onEsc(): void { if (this.svc.isOpen()) this.close(); }

  onInput(value: string): void {
    this.query.set(value);
    this.query$.next(value);
  }

  /** Categories/collections are small, already-cacheable lists — filtered client-side, unlike products (server-side search, potentially many). */
  private async runSearch(q: string): Promise<void> {
    const trimmed = q.trim();
    if (!trimmed) { this.results.set([]); this.error.set(null); return; }

    this.loading.set(true);
    this.error.set(null);
    try {
      const lower = trimmed.toLowerCase();
      const [productPage, categories] = await Promise.all([
        this.productQuery.search(trimmed, MAX_PRODUCT_MATCHES),
        this.categoryQuery.getAll().catch(() => [] as Category[]),
      ]);

      const categoryMatches: SearchResultItem[] = categories
        .filter(c => c.name.toLowerCase().includes(lower))
        .slice(0, MAX_CATEGORY_MATCHES)
        .map(category => ({ kind: 'category', category }));

      const productMatches: SearchResultItem[] = productPage.items.map(product => ({ kind: 'product', product }));

      this.results.set([...categoryMatches, ...productMatches]);
      this.analytics.trackSearch(trimmed);
      this.saveRecentSearch(trimmed);
    } catch (err) {
      this.results.set([]);
      this.error.set(err instanceof Error ? err.message : 'Search unavailable.');
    } finally {
      this.loading.set(false);
    }
  }

  private loadRecentSearches(): void {
    if (!isPlatformBrowser(this.pid)) return;
    try {
      const stored = localStorage.getItem(this.RECENT_SEARCHES_KEY);
      if (stored) {
        this.recentSearches.set(JSON.parse(stored));
      }
    } catch {
      this.recentSearches.set([]);
    }
  }

  private saveRecentSearch(query: string): void {
    if (!isPlatformBrowser(this.pid)) return;
    const current = this.recentSearches();
    const updated = [query, ...current.filter(s => s.toLowerCase() !== query.toLowerCase())].slice(0, this.MAX_RECENT);
    this.recentSearches.set(updated);
    try {
      localStorage.setItem(this.RECENT_SEARCHES_KEY, JSON.stringify(updated));
    } catch {
      // localStorage might be full
    }
  }

  clearRecentSearches(): void {
    this.recentSearches.set([]);
    if (isPlatformBrowser(this.pid)) {
      try {
        localStorage.removeItem(this.RECENT_SEARCHES_KEY);
      } catch {
        // ignore
      }
    }
  }

  retry(): void {
    void this.runSearch(this.query());
  }

  resultKey(item: SearchResultItem): string {
    switch (item.kind) {
      case 'product':    return `product:${item.product.id}`;
      case 'category':   return `category:${item.category.id}`;
    }
  }

  resultName(item: SearchResultItem): string {
    switch (item.kind) {
      case 'product':    return item.product.name;
      case 'category':   return item.category.name;
    }
  }

  resultSubLabel(item: SearchResultItem): string {
    switch (item.kind) {
      case 'product':    return item.product.category;
      case 'category':   return 'Category';
    }
  }

  navigate(item: SearchResultItem): void {
    this.analytics.trackSearchResultClick(this.query().trim());
    switch (item.kind) {
      case 'product':    this.router.navigate(['/product', item.product.id]); break;
      case 'category':   this.router.navigate(['/category', item.category.id]); break;
    }
    this.close();
  }

  viewAllResults(): void {
    const q = this.query().trim();
    if (!q) return;
    this.analytics.trackSearchResultClick(q);
    this.router.navigate(['/shop'], { queryParams: { q } });
    this.close();
  }

  onBackdropClick(e: MouseEvent): void {
    if ((e.target as HTMLElement).classList.contains('so-backdrop')) this.close();
  }

  close(): void {
    this.query.set('');
    this.results.set([]);
    this.svc.close();
  }
}
