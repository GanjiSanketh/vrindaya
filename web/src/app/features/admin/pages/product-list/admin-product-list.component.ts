import { Component, inject, signal, computed, OnDestroy } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ProductApiService } from '../../../../core/services/product-api.service';
import { VariantApiService } from '../../../../core/services/variant-api.service';
import { AdminAuthService } from '../../services/admin-auth.service';
import { APP_ROUTES } from '../../../../core/constants/routes.constants';
import { Product } from '../../../../core/models/product.model';
import type { ProductVariant } from '../../../../core/models/product-variant.model';
import { ProductSortField, ProductFlagName, AdminProductListQuery } from '../../../../core/models/product-api.model';
import { ProductPreviewDrawerComponent } from '../../components/product-preview-drawer/product-preview-drawer.component';
import { timestampMillis } from '../../../../shared/utils/timestamp.util';

type Tab = 'active' | 'deleted';
type StatusFilter = 'all' | 'active' | 'inactive';
type ExtraFilter = 'none' | 'category' | 'status' | 'featured' | 'newArrival' | 'bestSeller' | 'search' | 'price';
type PageSize = 20 | 50 | 100;

const PAGE_SIZE_OPTIONS: PageSize[] = [20, 50, 100];
const SEARCH_DEBOUNCE_MS = 300;

/**
 * Server-side paginated/filtered/sorted admin product list (Phase 13) —
 * every interaction (search, filter, sort, page) re-queries the API via
 * ProductApiService.queryPaged() rather than slicing a full-catalog cache.
 * See that service's doc comment for why it's kept fully separate from
 * `products()`/ensureLoaded() (still used only by the product form).
 *
 * Filters are mutually exclusive by design, matching exactly what the
 * backend's ProductQuery/ProductRepository actually applies (see that
 * type's doc comment) — picking one clears the others so the UI never
 * implies a combination the server would silently ignore.
 */
@Component({
  selector:    'app-admin-product-list',
  standalone:  true,
  imports:     [RouterLink, CommonModule, ProductPreviewDrawerComponent],
  templateUrl: './admin-product-list.component.html',
  styleUrl:    './admin-product-list.component.css',
})
export class AdminProductListComponent implements OnDestroy {
  private readonly api = inject(ProductApiService);
  private readonly variantApi = inject(VariantApiService);
  readonly auth = inject(AdminAuthService);
  readonly BASE = `/${APP_ROUTES.ADMIN}`;

  readonly canDelete = computed(() => this.auth.hasRole(['SuperAdmin', 'Admin']));

  readonly categories = ['long-kurtas', 'short-kurtas', '2-piece-sets', '3-piece-sets'];
  readonly pageSizeOptions = PAGE_SIZE_OPTIONS;

  readonly activeTab = signal<Tab>('active');

  readonly searchInput      = signal('');
  readonly searchQuery      = signal('');
  readonly categoryFilter   = signal('all');
  readonly statusFilter     = signal<StatusFilter>('all');
  readonly featuredOnly     = signal(false);
  readonly newArrivalOnly   = signal(false);
  readonly bestSellerOnly   = signal(false);
  readonly priceMinInput    = signal<number | null>(null);
  readonly priceMaxInput    = signal<number | null>(null);

  readonly sortField      = signal<ProductSortField>('displayOrder');
  readonly sortDescending = signal(false);

  readonly pageSize   = signal<PageSize>(20);
  readonly pageNumber = signal(1);
  private cursorStack: (string | undefined)[] = [undefined];

  readonly items       = signal<Product[]>([]);
  readonly totalCount  = signal(0);
  private nextCursor   = signal<string | null>(null);
  readonly loading     = signal(false);
  readonly loadError   = signal<string | null>(null);

  readonly selectedIds = signal<Set<string>>(new Set());
  readonly bulkBusy    = signal(false);

  readonly deleteId          = signal<string | null>(null);
  readonly permanentDeleteId = signal<string | null>(null);
  readonly previewId         = signal<string | null>(null);

  readonly expandedProductId    = signal<string | null>(null);
  readonly variantsByProduct    = signal<Record<string, ProductVariant[]>>({});
  readonly loadingVariants      = signal<Set<string>>(new Set());

  async toggleExpand(productId: string): Promise<void> {
    if (this.expandedProductId() === productId) {
      this.expandedProductId.set(null);
      return;
    }
    this.expandedProductId.set(productId);
    if (this.variantsByProduct()[productId]) return;
    this.loadingVariants.update(s => new Set(s).add(productId));
    try {
      const variants = await firstValueFrom(this.variantApi.getVariants(productId));
      this.variantsByProduct.update(m => ({ ...m, [productId]: variants ?? [] }));
    } catch {
      this.variantsByProduct.update(m => ({ ...m, [productId]: [] }));
    } finally {
      this.loadingVariants.update(s => { const n = new Set(s); n.delete(productId); return n; });
    }
  }

  readonly hasAnyFilter = computed(() =>
    !!this.searchQuery() || this.categoryFilter() !== 'all' || this.statusFilter() !== 'all'
    || this.featuredOnly() || this.newArrivalOnly() || this.bestSellerOnly()
    || this.priceMinInput() !== null || this.priceMaxInput() !== null,
  );

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.totalCount() / this.pageSize())));
  readonly hasNextPage = computed(() => this.nextCursor() !== null);

  readonly selectedCount = computed(() => this.selectedIds().size);
  readonly allVisibleSelected = computed(() => {
    const visible = this.items();
    return visible.length > 0 && visible.every(p => this.selectedIds().has(p.id));
  });

  private searchDebounceTimer?: ReturnType<typeof setTimeout>;

  constructor() {
    void this.load();
  }

  ngOnDestroy(): void {
    clearTimeout(this.searchDebounceTimer);
  }

  private buildQuery(): AdminProductListQuery {
    const query: AdminProductListQuery = {
      deleted:        this.activeTab() === 'deleted',
      pageSize:       this.pageSize(),
      cursor:         this.cursorStack[this.pageNumber() - 1],
      sortBy:         this.sortField(),
      sortDescending: this.sortDescending(),
    };

    if (this.categoryFilter() !== 'all') {
      query.category = this.categoryFilter();
    } else if (this.statusFilter() !== 'all') {
      query.activeStatus = this.statusFilter() === 'active';
    } else if (this.featuredOnly()) {
      query.featured = true;
    } else if (this.newArrivalOnly()) {
      query.newArrival = true;
    } else if (this.bestSellerOnly()) {
      query.bestSeller = true;
    } else if (this.searchQuery()) {
      query.search = this.searchQuery();
    } else if (this.priceMinInput() !== null || this.priceMaxInput() !== null) {
      if (this.priceMinInput() !== null) query.minPrice = this.priceMinInput()!;
      if (this.priceMaxInput() !== null) query.maxPrice = this.priceMaxInput()!;
    }

    return query;
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.loadError.set(null);
    try {
      const result = await this.api.queryPaged(this.buildQuery());
      this.items.set(result.items);
      this.totalCount.set(result.totalCount);
      this.nextCursor.set(result.nextCursor);
    } catch (err: unknown) {
      this.loadError.set(err instanceof Error ? err.message : 'Could not load products. Please try again.');
    } finally {
      this.loading.set(false);
    }
  }

  private resetAndReload(): void {
    this.cursorStack = [undefined];
    this.pageNumber.set(1);
    this.clearSelection();
    void this.load();
  }

  switchTab(tab: Tab): void {
    this.activeTab.set(tab);
    this.resetAndReload();
  }

  /* ── Filters (mutually exclusive — see class doc comment) ── */

  onSearchInput(value: string): void {
    this.searchInput.set(value);
    clearTimeout(this.searchDebounceTimer);
    this.searchDebounceTimer = setTimeout(() => {
      const trimmed = value.trim();
      this.searchQuery.set(trimmed);
      if (trimmed) this.clearOtherFilters('search');
      this.resetAndReload();
    }, SEARCH_DEBOUNCE_MS);
  }

  setCategoryFilter(value: string): void {
    this.categoryFilter.set(value);
    if (value !== 'all') this.clearOtherFilters('category');
    this.resetAndReload();
  }

  setStatusFilter(value: StatusFilter): void {
    this.statusFilter.set(value);
    if (value !== 'all') this.clearOtherFilters('status');
    this.resetAndReload();
  }

  toggleFeatured(): void {
    const next = !this.featuredOnly();
    this.featuredOnly.set(next);
    if (next) this.clearOtherFilters('featured');
    this.resetAndReload();
  }

  toggleNewArrival(): void {
    const next = !this.newArrivalOnly();
    this.newArrivalOnly.set(next);
    if (next) this.clearOtherFilters('newArrival');
    this.resetAndReload();
  }

  toggleBestSeller(): void {
    const next = !this.bestSellerOnly();
    this.bestSellerOnly.set(next);
    if (next) this.clearOtherFilters('bestSeller');
    this.resetAndReload();
  }

  applyPriceRange(min: string, max: string): void {
    this.priceMinInput.set(min === '' ? null : Number(min));
    this.priceMaxInput.set(max === '' ? null : Number(max));
    if (min !== '' || max !== '') this.clearOtherFilters('price');
    this.resetAndReload();
  }

  private clearOtherFilters(except: ExtraFilter): void {
    if (except !== 'category')   this.categoryFilter.set('all');
    if (except !== 'status')     this.statusFilter.set('all');
    if (except !== 'featured')   this.featuredOnly.set(false);
    if (except !== 'newArrival') this.newArrivalOnly.set(false);
    if (except !== 'bestSeller') this.bestSellerOnly.set(false);
    if (except !== 'search')     { this.searchQuery.set(''); this.searchInput.set(''); }
    if (except !== 'price')      { this.priceMinInput.set(null); this.priceMaxInput.set(null); }
  }

  clearAllFilters(): void {
    this.clearOtherFilters('none');
    this.resetAndReload();
  }

  /* ── Sort / page size / pagination ── */

  setSort(field: ProductSortField): void {
    if (this.sortField() === field) {
      this.sortDescending.update(v => !v);
    } else {
      this.sortField.set(field);
      this.sortDescending.set(false);
    }
    this.resetAndReload();
  }

  setPageSize(size: PageSize): void {
    this.pageSize.set(size);
    this.resetAndReload();
  }

  onPageSizeChange(value: string): void {
    this.setPageSize(Number(value) as PageSize);
  }

  /** Firestore Timestamp | ISO string | null → epoch millis, for the DatePipe (which can't consume a Timestamp directly). */
  updatedAtMillis(p: Product): number {
    return timestampMillis(p.updatedAt);
  }

  nextPage(): void {
    const cursor = this.nextCursor();
    if (!cursor) return;
    this.cursorStack[this.pageNumber()] = cursor;
    this.pageNumber.update(n => n + 1);
    this.clearSelection();
    void this.load();
  }

  prevPage(): void {
    if (this.pageNumber() <= 1) return;
    this.pageNumber.update(n => n - 1);
    this.clearSelection();
    void this.load();
  }

  /* ── Selection & bulk actions ── */

  toggleSelect(id: string): void {
    this.selectedIds.update(set => {
      const next = new Set(set);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  toggleSelectAllVisible(): void {
    const visible = this.items().map(p => p.id);
    const allSelected = this.allVisibleSelected();
    this.selectedIds.update(set => {
      const next = new Set(set);
      visible.forEach(id => allSelected ? next.delete(id) : next.add(id));
      return next;
    });
  }

  clearSelection(): void { this.selectedIds.set(new Set()); }

  async bulkActivate():   Promise<void> { await this.runBulk(ids => this.api.bulkStatus(ids, true)); }
  async bulkDeactivate(): Promise<void> { await this.runBulk(ids => this.api.bulkStatus(ids, false)); }
  async bulkRestore():    Promise<void> { await this.runBulk(ids => this.api.bulkRestore(ids)); }
  async bulkDelete():     Promise<void> { await this.runBulk(ids => this.api.bulkSoftDelete(ids)); }

  async bulkMarkFeatured():     Promise<void> { await this.runBulkFlag('Featured', true); }
  async bulkRemoveFeatured():   Promise<void> { await this.runBulkFlag('Featured', false); }
  async bulkMarkBestSeller():   Promise<void> { await this.runBulkFlag('BestSeller', true); }
  async bulkRemoveBestSeller(): Promise<void> { await this.runBulkFlag('BestSeller', false); }
  async bulkMarkNewArrival():   Promise<void> { await this.runBulkFlag('NewArrival', true); }
  async bulkRemoveNewArrival(): Promise<void> { await this.runBulkFlag('NewArrival', false); }

  private async runBulkFlag(flag: ProductFlagName, value: boolean): Promise<void> {
    await this.runBulk(ids => this.api.bulkFlag(ids, flag, value));
  }

  private async runBulk(action: (ids: string[]) => Promise<void>): Promise<void> {
    const ids = [...this.selectedIds()];
    if (!ids.length) return;
    this.bulkBusy.set(true);
    try {
      await action(ids);
      this.clearSelection();
      await this.load();
    } catch (err: unknown) {
      this.loadError.set(err instanceof Error ? err.message : 'That bulk action failed. Please try again.');
    } finally {
      this.bulkBusy.set(false);
    }
  }

  /* ── Single-row actions ── */

  confirmDelete(id: string): void { this.deleteId.set(id); }
  cancelDelete():            void { this.deleteId.set(null); }

  /** Optimistic — the row disappears the instant the admin confirms, rolled back if the request fails. */
  async doDelete(): Promise<void> {
    const id = this.deleteId();
    if (id === null) return;
    this.deleteId.set(null);

    const previous = this.items();
    this.items.set(previous.filter(p => p.id !== id));

    try {
      await this.api.softDelete(id);
      await this.load();
    } catch {
      this.items.set(previous);
      this.loadError.set('Could not delete this product. Please try again.');
    }
  }

  confirmPermanentDelete(id: string): void { this.permanentDeleteId.set(id); }
  cancelPermanentDelete():            void { this.permanentDeleteId.set(null); }

  async doPermanentDelete(): Promise<void> {
    const id = this.permanentDeleteId();
    if (id === null) return;
    this.permanentDeleteId.set(null);

    const previous = this.items();
    this.items.set(previous.filter(p => p.id !== id));

    try {
      await this.api.permanentlyDelete(id);
      await this.load();
    } catch {
      this.items.set(previous);
      this.loadError.set('Could not permanently delete this product. Please try again.');
    }
  }

  async restore(id: string): Promise<void> {
    await this.api.restore(id);
    await this.load();
  }

  async duplicate(id: string): Promise<void> {
    await this.api.duplicate(id);
    await this.load();
  }

  openPreview(id: string):  void { this.previewId.set(id); }
  closePreview():           void { this.previewId.set(null); }

  trackById(_: number, p: Product): string { return p.id; }
}
