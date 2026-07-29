import { Component, signal, computed, inject, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MarketplaceLayoutComponent } from '../../layouts/marketplace-layout.component';
import { MarketplaceListingService } from '../../services/marketplace-listing.service';
import { MarketplaceProductService } from '../../services/marketplace-product.service';
import { MarketplaceLogService } from '../../services/marketplace-log.service';
import type { MarketplaceListing } from '../../models/marketplace-listing.model';
import type { MarketplaceProduct } from '../../models/marketplace-product.model';
import { MARKETPLACE_LABELS } from '../../models/marketplace-platform.model';

interface ListingRow {
  listing: MarketplaceListing;
  product: MarketplaceProduct | null;
}

@Component({
  selector: 'app-marketplace-listings',
  standalone: true,
  imports: [CommonModule, MarketplaceLayoutComponent],
  template: `
    <app-marketplace-layout title="Marketplace Listings" subtitle="View and manage your active listings across platforms.">
      <div actions class="d-flex gap-2">
        <button class="btn btn-sm btn-outline-secondary" (click)="load()" [disabled]="loading()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-1"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg> Refresh
        </button>
      </div>

      @if (error()) {
        <div class="alert alert-danger py-2 small border-0 d-flex justify-content-between align-items-center mb-3">{{ error() }}<button class="btn btn-sm btn-link text-decoration-none text-danger p-0" (click)="error.set(null)">&times;</button></div>
      }
      @if (successMessage()) {
        <div class="alert alert-success py-2 small border-0 d-flex justify-content-between align-items-center mb-3">{{ successMessage() }}<button class="btn btn-sm btn-link text-decoration-none text-success p-0" (click)="successMessage.set(null)">&times;</button></div>
      }

      <!-- Search + Filters -->
      <div class="d-flex gap-2 flex-wrap align-items-center mb-3">
        <div class="input-group input-group-sm" style="width:240px">
          <span class="input-group-text bg-white border-end-0"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#888" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></span>
          <input class="form-control border-start-0 ps-0" placeholder="Search by title or SKU..." [value]="searchTerm()" (input)="onSearch($event)" />
        </div>
        <select class="form-select form-select-sm" style="width:auto" (change)="filterPlatform.set($any($event.target).value)">
          <option value="">All Platforms</option>
          @for (p of PLATFORMS; track p) { <option [value]="p" [selected]="filterPlatform()===p">{{ platformLabel(p) }}</option> }
        </select>
        <select class="form-select form-select-sm" style="width:auto" (change)="filterStatus.set($any($event.target).value)">
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="unpublished">Unpublished</option>
          <option value="inactive">Inactive</option>
        </select>
        <select class="form-select form-select-sm" style="width:auto" (change)="filterAi.set($any($event.target).value)">
          <option value="">AI Status</option>
          <option value="completed">Completed</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed</option>
        </select>
        <span class="small text-muted">{{ total() }} total</span>
      </div>

      <!-- Bulk Actions -->
      @if (selectedIds().size > 0) {
        <div class="d-flex gap-2 align-items-center mb-3 p-2 bg-light rounded">
          <span class="small fw-medium">{{ selectedIds().size }} selected</span>
          <button class="btn btn-sm btn-success" (click)="bulkPublish()" [disabled]="busy()">Publish</button>
          <button class="btn btn-sm btn-warning" (click)="bulkArchive()" [disabled]="busy()">Archive</button>
          <button class="btn btn-sm btn-danger" (click)="bulkDelete()" [disabled]="busy()">Delete</button>
          <button class="btn btn-sm btn-outline-info" (click)="bulkRegenerateAi()" [disabled]="busy()">Regenerate AI</button>
          <button class="btn btn-sm btn-outline-secondary" (click)="clearSelection()">Clear</button>
        </div>
      }

      <!-- Table -->
      @if (loading() && !rows().length) {
        <div class="text-center py-5"><div class="spinner-border text-primary"></div><p class="text-muted small mt-2">Loading listings...</p></div>
      } @else if (!filtered().length) {
        <div class="card border-0 shadow-sm"><div class="card-body text-center py-5">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ccc" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
          <p class="text-muted small mt-3 mb-0">No listings found.</p></div></div>
      } @else {
        <div class="table-responsive rounded border">
          <table class="table table-hover align-middle mb-0" style="font-size:.82rem">
            <thead class="table-light">
              <tr>
                <th style="width:32px"><input type="checkbox" class="form-check-input" [checked]="allSelected()" [indeterminate]="someSelected()" (change)="toggleAll()" /></th>
                <th style="width:50px">Image</th>
                <th>Product Title</th>
                <th style="width:100px">Marketplace</th>
                <th style="width:90px">Status</th>
                <th style="width:100px">Category</th>
                <th style="width:80px">Brand</th>
                <th style="width:80px">Price</th>
                <th style="width:100px">Last Updated</th>
                <th style="width:90px">Sync Status</th>
                <th style="width:80px">AI Status</th>
                <th style="width:70px"></th>
              </tr>
            </thead>
            <tbody>
              @for (row of filtered(); track row.listing.id; let i = $index) {
                <tr [class.table-warning]="row.listing.publishStatus==='unpublished'" [class.table-light]="row.listing.publishStatus==='draft'">
                  <td><input type="checkbox" class="form-check-input" [checked]="selectedIds().has(row.listing.id!)" (change)="toggleSelect(row.listing.id!)" /></td>
                  <td>
                    @if (primaryImage(row); as img) {
                      <img [src]="img" alt="" class="rounded border" style="width:40px;height:40px;object-fit:cover" referrerpolicy="no-referrer" />
                    } @else {
                      <div class="rounded border bg-light d-flex align-items-center justify-content-center" style="width:40px;height:40px">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#bbb" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
                      </div>
                    }
                  </td>
                  <td>
                    <div class="fw-medium text-truncate" style="max-width:220px">{{ row.listing.marketplaceTitle || row.product?.name || 'Untitled' }}</div>
                    @if (row.listing.marketplaceSku) { <div class="text-muted" style="font-size:.68rem">SKU: {{ row.listing.marketplaceSku }}</div> }
                  </td>
                  <td><span class="badge bg-secondary bg-opacity-10 text-secondary" style="font-size:.72rem">{{ platformLabel(row.listing.platform) }}</span></td>
                  <td><span class="badge" [class]="statusBadge(row.listing.publishStatus)">{{ row.listing.publishStatus }}</span></td>
                  <td class="text-muted" style="font-size:.78rem">{{ row.product?.category || '-' }}</td>
                  <td class="text-muted" style="font-size:.78rem">{{ row.product?.brand || '-' }}</td>
                  <td class="fw-medium">&commat;{{ (row.listing.pricing)?.sellingPrice ?? '-' }}</td>
                  <td class="text-muted" style="font-size:.72rem">{{ formatDate(row.listing.updatedAt) }}</td>
                  <td>
                    <span class="badge" [class]="syncBadge(row.listing.publishStatus)">{{ row.listing.publishStatus }}</span>
                  </td>
                  <td>
                    <span class="badge" [class]="aiBadge(row.listing.aiStatus)">{{ row.listing.aiStatus }}</span>
                  </td>
                  <td>
                    <button class="btn btn-sm btn-link text-decoration-none py-0 px-1" (click)="viewDetail(row.listing.id!)" title="View details">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div class="d-flex justify-content-between align-items-center mt-3">
          <div class="d-flex align-items-center gap-2">
            <span class="small text-muted">Rows per page:</span>
            <select class="form-select form-select-sm" style="width:auto" [value]="pageSize()" (change)="onPageSize($event)">
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
          </div>
          <div class="d-flex align-items-center gap-1">
            <button class="btn btn-sm btn-outline-secondary" [disabled]="page() <= 1" (click)="goPage(page() - 1)">&lsaquo;</button>
            @for (p of pageNumbers(); track p) {
              <button class="btn btn-sm" [class.btn-primary]="p === page()" [class.btn-outline-secondary]="p !== page()" (click)="goPage(p)">{{ p }}</button>
            }
            <button class="btn btn-sm btn-outline-secondary" [disabled]="page() >= totalPages()" (click)="goPage(page() + 1)">&rsaquo;</button>
          </div>
        </div>
      }
    </app-marketplace-layout>
  `,
  styles: [`
    .table th{font-size:.72rem;text-transform:uppercase;letter-spacing:.03em;color:#666;white-space:nowrap;padding:.5rem .5rem}
    .table td{padding:.4rem .5rem}
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MarketplaceListingsComponent implements OnInit {
  private readonly listingSvc = inject(MarketplaceListingService);
  private readonly productSvc = inject(MarketplaceProductService);
  private readonly logSvc = inject(MarketplaceLogService);
  private readonly router = inject(Router);

  readonly PLATFORMS: string[] = ['amazon', 'flipkart', 'meesho', 'myntra', 'ajio'];
  readonly LABELS = MARKETPLACE_LABELS;

  // Signals from base service
  readonly items = this.listingSvc.items;
  readonly loading = this.listingSvc.loading;
  readonly error = this.listingSvc.error;
  readonly total = this.listingSvc.total;
  readonly page = this.listingSvc.currentPage;
  readonly pageSize = this.listingSvc.pageSize;
  readonly selectedIds = this.listingSvc.selectedIds;
  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.pageSize())));

  readonly searchTerm = signal('');
  readonly filterPlatform = signal('');
  readonly filterStatus = signal('');
  readonly filterAi = signal('');
  readonly successMessage = signal<string | null>(null);
  readonly busy = signal(false);
  private productCache = signal<Map<string, MarketplaceProduct>>(new Map());
  readonly rows = signal<ListingRow[]>([]);

  filtered = computed(() => {
    let list = this.rows();
    const plat = this.filterPlatform();
    const status = this.filterStatus();
    const ai = this.filterAi();
    if (plat) list = list.filter(r => r.listing.platform === plat);
    if (status) list = list.filter(r => r.listing.publishStatus === status || r.listing.listingStatus === status);
    if (ai) list = list.filter(r => r.listing.aiStatus === ai);
    return list;
  });

  allSelected = computed(() => this.filtered().length > 0 && this.filtered().every(r => this.selectedIds().has(r.listing.id!)));
  someSelected = computed(() => this.filtered().some(r => this.selectedIds().has(r.listing.id!)));

  pageNumbers = computed(() => {
    const tp = this.totalPages();
    const cp = this.page();
    const pages: number[] = [];
    const start = Math.max(1, cp - 2);
    const end = Math.min(tp, cp + 2);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  });

  ngOnInit(): void {
    this.load();
  }

  async load(): Promise<void> {
    this.error.set(null);
    this.successMessage.set(null);
    try {
      await this.listingSvc.getAll({
        page: this.page(),
        pageSize: this.pageSize(),
        sortField: 'updatedAt',
        sortDirection: 'desc',
      });
      await this.loadProducts();
    } catch (e: any) {
      this.error.set(e?.message || 'Failed to load listings');
    }
  }

  private async loadProducts(): Promise<void> {
    const listings = this.items();
    const cache = this.productCache();
    const missing = new Set<string>();
    for (const l of listings) {
      if (l.marketplaceProductId && !cache.has(l.marketplaceProductId)) {
        missing.add(l.marketplaceProductId);
      }
    }
    const newCache = new Map(cache);
    for (const pid of missing) {
      try {
        const p = await this.productSvc.getById(pid);
        if (p) newCache.set(pid, p);
      } catch { /* product may be deleted */ }
    }
    this.productCache.set(newCache);
    this.rows.set(listings.map(l => ({
      listing: l,
      product: l.marketplaceProductId ? (newCache.get(l.marketplaceProductId) ?? null) : null,
    })));
  }

  primaryImage(row: ListingRow): string | null {
    if (!row.product?.images?.length) return null;
    const primary = row.product.images.find(i => i.isPrimary) || row.product.images[0];
    return primary?.url || null;
  }

  statusBadge(s: string): string {
    const m: Record<string, string> = {
      active: 'bg-success bg-opacity-10 text-success',
      published: 'bg-success bg-opacity-10 text-success',
      draft: 'bg-secondary bg-opacity-10 text-secondary',
      inactive: 'bg-warning bg-opacity-10 text-warning',
      unpublished: 'bg-warning bg-opacity-10 text-warning',
      pending: 'bg-info bg-opacity-10 text-info',
      rejected: 'bg-danger bg-opacity-10 text-danger',
      blocked: 'bg-danger bg-opacity-10 text-danger',
    };
    return m[s] || 'bg-secondary bg-opacity-10 text-secondary';
  }

  syncBadge(s: string): string {
    if (s === 'published' || s === 'active') return 'bg-success bg-opacity-10 text-success';
    if (s === 'draft') return 'bg-secondary bg-opacity-10 text-secondary';
    return 'bg-warning bg-opacity-10 text-warning';
  }

  aiBadge(s: string): string {
    const m: Record<string, string> = {
      completed: 'bg-success bg-opacity-10 text-success',
      pending: 'bg-warning bg-opacity-10 text-warning',
      processing: 'bg-info bg-opacity-10 text-info',
      failed: 'bg-danger bg-opacity-10 text-danger',
      not_applicable: 'bg-secondary bg-opacity-10 text-secondary',
    };
    return m[s] || 'bg-secondary bg-opacity-10 text-secondary';
  }

  platformLabel(p: string): string {
    return (this.LABELS as Record<string, string>)[p] || p;
  }

  formatDate(d: Date | string | undefined): string {
    if (!d) return '-';
    const dt = typeof d === 'string' ? new Date(d) : d;
    return dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  onSearch(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
  }

  onPageSize(event: Event): void {
    const val = parseInt((event.target as HTMLSelectElement).value, 10);
    this.listingSvc.pageSize.set(val);
    this.listingSvc.currentPage.set(1);
    this.load();
  }

  goPage(p: number): void {
    if (p < 1 || p > this.totalPages()) return;
    this.listingSvc.currentPage.set(p);
    this.load();
  }

  toggleSelect(id: string): void {
    this.listingSvc.selectedIds.update(s => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  toggleAll(): void {
    const all = this.filtered().map(r => r.listing.id!).filter(Boolean);
    if (this.allSelected()) {
      this.listingSvc.selectedIds.set(new Set());
    } else {
      this.listingSvc.selectedIds.set(new Set(all));
    }
  }

  clearSelection(): void {
    this.listingSvc.selectedIds.set(new Set());
  }

  viewDetail(id: string): void {
    this.router.navigate(['/admin', 'marketplace', 'listings', id]);
  }

  async bulkPublish(): Promise<void> {
    const ids = [...this.selectedIds()];
    if (!ids.length) return;
    this.busy.set(true);
    try {
      await this.listingSvc.bulkPublish(ids);
      this.successMessage.set(`Published ${ids.length} listing(s).`);
      this.clearSelection();
      await this.load();
    } catch (e: any) {
      this.error.set(e?.message || 'Publish failed');
    } finally {
      this.busy.set(false);
    }
  }

  async bulkArchive(): Promise<void> {
    const ids = [...this.selectedIds()];
    if (!ids.length) return;
    this.busy.set(true);
    try {
      await this.listingSvc.bulkUnpublish(ids);
      this.successMessage.set(`Archived ${ids.length} listing(s).`);
      this.clearSelection();
      await this.load();
    } catch (e: any) {
      this.error.set(e?.message || 'Archive failed');
    } finally {
      this.busy.set(false);
    }
  }

  async bulkDelete(): Promise<void> {
    const ids = [...this.selectedIds()];
    if (!ids.length) return;
    this.busy.set(true);
    try {
      for (const id of ids) {
        await this.listingSvc.delete(id);
      }
      this.successMessage.set(`Deleted ${ids.length} listing(s).`);
      this.clearSelection();
      await this.load();
    } catch (e: any) {
      this.error.set(e?.message || 'Delete failed');
    } finally {
      this.busy.set(false);
    }
  }

  async bulkRegenerateAi(): Promise<void> {
    const ids = [...this.selectedIds()];
    if (!ids.length) return;
    this.busy.set(true);
    try {
      for (const id of ids) {
        await this.listingSvc.update(id, { aiStatus: 'pending' } as any);
      }
      this.successMessage.set(`AI regeneration queued for ${ids.length} listing(s).`);
      this.clearSelection();
      await this.load();
    } catch (e: any) {
      this.error.set(e?.message || 'Regeneration failed');
    } finally {
      this.busy.set(false);
    }
  }
}
