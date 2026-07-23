import {
  Component, effect, HostListener, inject,
  OnDestroy, OnInit, PLATFORM_ID, signal, ChangeDetectionStrategy,
} from '@angular/core';
import { isPlatformBrowser }               from '@angular/common';
import { FormsModule }                     from '@angular/forms';
import { Router }                          from '@angular/router';
import { Subject, Subscription }           from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { SearchService }       from '../../core/services/search.service';
import { ProductQueryService } from '../../core/services/product-query.service';
import { CategoryService }     from '../../core/services/category.service';
import { Product, Category }   from '../../core/models/product.model';

export type SearchResultItem =
  | { kind: 'product'; product: Product }
  | { kind: 'category'; category: Category };

const MAX_CATEGORY_MATCHES = 3;
const MAX_PRODUCT_MATCHES = 8;

@Component({
  selector: 'app-search-overlay',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './search-overlay.component.html',
  styleUrl:    './search-overlay.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchOverlayComponent implements OnInit, OnDestroy {
  readonly svc     = inject(SearchService);
  private readonly productQuery    = inject(ProductQueryService);
  private readonly categoryQuery   = inject(CategoryService);
  private readonly router  = inject(Router);
  private readonly pid     = inject(PLATFORM_ID);

  readonly query   = signal('');
  readonly results = signal<SearchResultItem[]>([]);
  readonly loading = signal(false);
  readonly error   = signal<string | null>(null);

  readonly hints = ['Floral', 'Indigo', '3-Piece', 'Kurta Set', 'Embroidered', 'Pastel'];

  private readonly query$ = new Subject<string>();
  private sub!: Subscription;

  constructor() {
    // Scroll-lock and autofocus when overlay opens
    effect(() => {
      const open = this.svc.isOpen();
      if (isPlatformBrowser(this.pid)) {
        document.body.style.overflow = open ? 'hidden' : '';
        if (open) {
          setTimeout(() => {
            (document.querySelector('.so-input') as HTMLInputElement)?.focus();
          }, 60);
        }
      }
    });
  }

  ngOnInit(): void {
    this.sub = this.query$
      .pipe(debounceTime(250), distinctUntilChanged())
      .subscribe(q => this.runSearch(q));
  }

  ngOnDestroy(): void { this.sub?.unsubscribe(); }

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
    } catch (err) {
      this.results.set([]);
      this.error.set(err instanceof Error ? err.message : 'Search unavailable.');
    } finally {
      this.loading.set(false);
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
    switch (item.kind) {
      case 'product':    this.router.navigate(['/product', item.product.id]); break;
      case 'category':   this.router.navigate(['/category', item.category.id]); break;
    }
    this.close();
  }

  viewAllResults(): void {
    const q = this.query().trim();
    if (!q) return;
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
