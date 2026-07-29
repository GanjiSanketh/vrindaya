import { Component, signal, computed, inject, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MarketplaceLayoutComponent } from '../../layouts/marketplace-layout.component';
import { MarketplaceProductService } from '../../services/marketplace-product.service';
import { MarketplaceListingService } from '../../services/marketplace-listing.service';
import { MarketplaceSyncService } from '../../services/marketplace-sync.service';
import { SyncEngineService } from '../../services/sync/sync-engine.service';
import { SyncComparatorService } from '../../services/sync/sync-comparator.service';
import { SyncAuditService } from '../../services/sync/sync-audit.service';
import type { MarketplaceProduct } from '../../models/marketplace-product.model';
import type { MarketplaceListing } from '../../models/marketplace-listing.model';
import type { MarketplaceSync } from '../../models/marketplace-sync.model';
import type { ListingComparison } from '../../services/sync/models/sync-comparison.model';
import type { SyncAuditEntry } from '../../services/sync/sync-audit.service';
import { MARKETPLACE_LABELS, type MarketplacePlatformType } from '../../models/marketplace-platform.model';

interface SyncRow {
  product: MarketplaceProduct;
  listings: MarketplaceListing[];
  comparisons: ListingComparison[];
  missingListings: string[];
  missingAi: boolean;
  missingImages: boolean;
  missingAttributes: boolean;
  priceMismatch: boolean;
  inventoryMismatch: boolean;
  outdated: boolean;
  _expanded: boolean;
}

@Component({
  selector: 'app-marketplace-sync-centre',
  standalone: true,
  imports: [CommonModule, MarketplaceLayoutComponent],
  template: `
    <app-marketplace-layout
      title="Sync Centre"
      subtitle="Compare your product catalog with marketplace listings. Detect missing data, sync changes, and track history."
    >
      <div actions class="d-flex gap-2 flex-wrap">
        <button class="btn btn-sm btn-primary" (click)="runFullSync()" [disabled]="busy()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-1"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg> Run Full Sync
        </button>
        <button class="btn btn-sm btn-outline-danger" (click)="retryAllFailed()" [disabled]="busy() || !failedSyncs().length">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-1"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg> Retry All Failed ({{ failedSyncs().length }})
        </button>
        <button class="btn btn-sm btn-outline-secondary" (click)="refresh()" [disabled]="loading()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-1"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg> Refresh
        </button>
      </div>

      @if (syncEngine.progress(); as p) {
        @if (p.current !== 'Done') {
          <div class="d-flex align-items-center gap-2 mb-3 p-2 bg-light rounded">
            <div class="spinner-border spinner-border-sm text-primary"></div>
            <span class="small">{{ p.current }}</span>
            <div class="progress flex-grow-1" style="height:6px">
              <div class="progress-bar progress-bar-striped progress-bar-animated" [style.width.%]="p.total ? (p.completed / p.total * 100) : 0"></div>
            </div>
            <small class="text-muted">{{ p.completed }}/{{ p.total }} ({{ p.failed }} failed)</small>
          </div>
        }
        @if (syncEngine.lastResult(); as r) {
          <div class="alert alert-info py-2 small border-0 d-flex justify-content-between mb-3">
            {{ r }}
            <button class="btn btn-sm btn-link text-decoration-none p-0 text-info" (click)="syncEngine.lastResult.set(null)">&times;</button>
          </div>
        }
      }

      @if (error()) {
        <div class="alert alert-danger py-2 small border-0 d-flex justify-content-between mb-3">
          {{ error() }}
          <button class="btn btn-sm btn-link text-decoration-none p-0 text-danger" (click)="error.set(null)">&times;</button>
        </div>
      }
      @if (successMessage()) {
        <div class="alert alert-success py-2 small border-0 d-flex justify-content-between mb-3">
          {{ successMessage() }}
          <button class="btn btn-sm btn-link text-decoration-none p-0 text-success" (click)="successMessage.set(null)">&times;</button>
        </div>
      }

      @if (loading() && !rows().length) {
        <div class="text-center py-5"><div class="spinner-border text-primary"></div><p class="text-muted small mt-2">Loading catalog data...</p></div>
      }

      <ul class="nav nav-tabs border-0 mb-3">
        <li class="nav-item"><button class="nav-link py-2 px-3 small" [class.active]="tab() === 'overview'" (click)="tab.set('overview')">Overview</button></li>
        <li class="nav-item"><button class="nav-link py-2 px-3 small" [class.active]="tab() === 'comparisons'" (click)="tab.set('comparisons')">Comparisons ({{ filtered().length }})</button></li>
        <li class="nav-item"><button class="nav-link py-2 px-3 small" [class.active]="tab() === 'history'" (click)="tab.set('history')">Sync History ({{ syncHistory().length }})</button></li>
      </ul>

      <!-- ======================== OVERVIEW ======================== -->
      @if (tab() === 'overview') {
        <div class="row g-3">
          <div class="col-6 col-md-3">
            <div class="card border-0 shadow-sm text-center py-3">
              <div class="h4 mb-0 fw-semibold">{{ stats().totalProducts }}</div>
              <div class="small text-muted">Total Products</div>
            </div>
          </div>
          <div class="col-6 col-md-3" (click)="navTo('comparisons', 'missing_listing')" style="cursor:pointer">
            <div class="card border-0 shadow-sm text-center py-3" [class.border-warning]="stats().missingListings > 0">
              <div class="h4 mb-0 fw-semibold" [class.text-warning]="stats().missingListings > 0">{{ stats().missingListings }}</div>
              <div class="small text-muted">Missing Listings</div>
            </div>
          </div>
          <div class="col-6 col-md-3" (click)="navTo('comparisons', 'missing_ai')" style="cursor:pointer">
            <div class="card border-0 shadow-sm text-center py-3" [class.border-warning]="stats().missingAi > 0">
              <div class="h4 mb-0 fw-semibold" [class.text-warning]="stats().missingAi > 0">{{ stats().missingAi }}</div>
              <div class="small text-muted">Missing AI Content</div>
            </div>
          </div>
          <div class="col-6 col-md-3" (click)="navTo('comparisons', 'missing_images')" style="cursor:pointer">
            <div class="card border-0 shadow-sm text-center py-3" [class.border-warning]="stats().missingImages > 0">
              <div class="h4 mb-0 fw-semibold" [class.text-warning]="stats().missingImages > 0">{{ stats().missingImages }}</div>
              <div class="small text-muted">Missing Images</div>
            </div>
          </div>
          <div class="col-6 col-md-3" (click)="navTo('comparisons', 'missing_attributes')" style="cursor:pointer">
            <div class="card border-0 shadow-sm text-center py-3" [class.border-warning]="stats().missingAttributes > 0">
              <div class="h4 mb-0 fw-semibold" [class.text-warning]="stats().missingAttributes > 0">{{ stats().missingAttributes }}</div>
              <div class="small text-muted">Missing Attributes</div>
            </div>
          </div>
          <div class="col-6 col-md-3" (click)="navTo('comparisons', 'price_mismatch')" style="cursor:pointer">
            <div class="card border-0 shadow-sm text-center py-3" [class.border-danger]="stats().priceMismatches > 0">
              <div class="h4 mb-0 fw-semibold" [class.text-danger]="stats().priceMismatches > 0">{{ stats().priceMismatches }}</div>
              <div class="small text-muted">Price Mismatches</div>
            </div>
          </div>
          <div class="col-6 col-md-3" (click)="navTo('comparisons', 'inventory_mismatch')" style="cursor:pointer">
            <div class="card border-0 shadow-sm text-center py-3" [class.border-danger]="stats().inventoryMismatches > 0">
              <div class="h4 mb-0 fw-semibold" [class.text-danger]="stats().inventoryMismatches > 0">{{ stats().inventoryMismatches }}</div>
              <div class="small text-muted">Inventory Mismatches</div>
            </div>
          </div>
          <div class="col-6 col-md-3" (click)="navTo('comparisons', 'outdated')" style="cursor:pointer">
            <div class="card border-0 shadow-sm text-center py-3" [class.border-info]="stats().outdated > 0">
              <div class="h4 mb-0 fw-semibold" [class.text-info]="stats().outdated > 0">{{ stats().outdated }}</div>
              <div class="small text-muted">Outdated Listings</div>
            </div>
          </div>
        </div>

        @if (recentAudit().length) {
          <div class="card border-0 shadow-sm mt-4">
            <div class="card-header bg-white fw-semibold small py-2">Recent Sync Activity</div>
            <div class="card-body p-0">
              <div class="list-group list-group-flush">
                @for (e of recentAudit(); track e.id) {
                  <div class="list-group-item py-2 px-3 d-flex align-items-center gap-2 small">
                    <span class="badge" [class]="e.status==='completed' ? 'bg-success bg-opacity-10 text-success' : 'bg-danger bg-opacity-10 text-danger'">{{ e.action }}</span>
                    <span class="text-muted">{{ e.field }}</span>
                    <span class="text-muted ms-auto">{{ formatDate(e.createdAt) }}</span>
                  </div>
                }
              </div>
            </div>
          </div>
        }
      }

      <!-- ======================== COMPARISONS ======================== -->
      @if (tab() === 'comparisons') {
        <div class="d-flex gap-2 flex-wrap align-items-center mb-3">
          <div class="input-group input-group-sm" style="width:200px">
            <span class="input-group-text bg-white border-end-0"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#888" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></span>
            <input class="form-control border-start-0 ps-0" placeholder="Search product..." [value]="searchTerm()" (input)="onSearch($event)" />
          </div>
          <select class="form-select form-select-sm" style="width:auto" (change)="filterPlatform.set($any($event.target).value)">
            <option value="">All Platforms</option>
            @for (p of PLATFORMS; track p) { <option [value]="p" [selected]="filterPlatform()===p">{{ platformLabel(p) }}</option> }
          </select>
          <select class="form-select form-select-sm" style="width:auto" (change)="filterIssue.set($any($event.target).value)">
            <option value="">All Issues</option>
            <option value="missing_listing">Missing Listing</option>
            <option value="missing_ai">Missing AI Content</option>
            <option value="missing_images">Missing Images</option>
            <option value="missing_attributes">Missing Attributes</option>
            <option value="price_mismatch">Price Mismatch</option>
            <option value="inventory_mismatch">Inventory Mismatch</option>
            <option value="outdated">Outdated</option>
          </select>
          @if (selectedIds().size) {
            <span class="small fw-medium">{{ selectedIds().size }} selected</span>
            <button class="btn btn-sm btn-primary" (click)="bulkSync()" [disabled]="busy()">Sync Selected</button>
            <button class="btn btn-sm btn-outline-secondary" (click)="clearSelection()">Clear</button>
          }
          <span class="small text-muted ms-auto">{{ filtered().length }} products</span>
        </div>

        @if (!rows().length) {
          <div class="card border-0 shadow-sm"><div class="card-body text-center py-5">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ccc" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
            <p class="text-muted small mt-3 mb-0">No comparison data found.</p></div></div>
        }

        @for (row of filtered(); track row.product.id) {
          <div class="card border-0 shadow-sm mb-3">
            <div class="card-body py-2 px-3 d-flex align-items-center gap-3" style="cursor:pointer" (click)="row._expanded = !row._expanded">
              <input type="checkbox" class="form-check-input" (click)="$event.stopPropagation()" (change)="toggleSelect(row.product.id!)" [checked]="selectedIds().has(row.product.id!)" />
              @if (row.product.images.length) {
                <img [src]="(row.product.images.find(i=>i.isPrimary)||row.product.images[0])!.url" alt="" class="rounded border" style="width:36px;height:36px;object-fit:cover" referrerpolicy="no-referrer" />
              } @else {
                <div class="rounded border bg-light d-flex align-items-center justify-content-center" style="width:36px;height:36px">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#bbb" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
                </div>
              }
              <div class="flex-grow-1 min-w-0">
                <div class="fw-medium small text-truncate">{{ row.product.name }}</div>
                <div class="small text-muted">{{ row.product.brand || '' }}{{ row.product.brand && row.product.category ? ' · ' : '' }}{{ row.product.category || '' }}</div>
              </div>

              <div class="d-flex gap-1 flex-wrap" style="max-width:300px">
                @if (!row.listings.length) {
                  <span class="badge bg-danger bg-opacity-10 text-danger" title="No listing exists for any platform">No Listing</span>
                }
                @for (p of row.missingListings; track p) {
                  <span class="badge bg-warning bg-opacity-10 text-warning">No {{ platformLabel(p) }}</span>
                }
                @if (row.missingAi) { <span class="badge bg-warning bg-opacity-10 text-warning">No AI</span> }
                @if (row.missingImages) { <span class="badge bg-warning bg-opacity-10 text-warning">No Img</span> }
                @if (row.priceMismatch) { <span class="badge bg-danger bg-opacity-10 text-danger">Price</span> }
                @if (row.inventoryMismatch) { <span class="badge bg-danger bg-opacity-10 text-danger">Stock</span> }
                @if (row.outdated) { <span class="badge bg-info bg-opacity-10 text-info">Outdated</span> }
                @if (row.missingAttributes) { <span class="badge bg-warning bg-opacity-10 text-warning">Attr</span> }
                @if (row.comparisons.length && !row.missingListings.length && !row.missingAi && !row.missingImages && !row.priceMismatch && !row.inventoryMismatch && !row.outdated && !row.missingAttributes) {
                  <span class="badge bg-success bg-opacity-10 text-success">Synced</span>
                }
              </div>

              <div class="d-flex gap-1 flex-shrink-0">
                <button class="btn btn-sm btn-outline-primary py-0 px-2" (click)="$event.stopPropagation(); syncProduct(row.product.id!)" [disabled]="busy()" title="Sync now">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
                </button>
                <button class="btn btn-sm btn-outline-secondary py-0 px-2" (click)="$event.stopPropagation(); row._expanded = !row._expanded" title="Expand details">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
                </button>
              </div>
            </div>

            @if (row._expanded) {
              <div class="card-footer bg-white border-top p-0">
                @if (row.comparisons.length) {
                  @for (cmp of row.comparisons; track cmp.listingId) {
                    <div class="px-3 py-2 border-bottom small">
                      <div class="fw-medium mb-1">{{ platformLabel(cmp.platform) }} · {{ cmp.listingId.slice(0, 8) }}...</div>
                      <table class="table table-sm mb-0" style="font-size:.75rem">
                        <thead><tr><th>Field</th><th>Source (Product)</th><th>Target (Listing)</th><th>Status</th></tr></thead>
                        <tbody>
                          @for (d of cmp.diffs; track d.field) {
                            <tr>
                              <td class="fw-medium">{{ d.label }}</td>
                              <td class="text-break" style="max-width:200px">{{ formatValue(d.sourceValue) }}</td>
                              <td class="text-break" style="max-width:200px">{{ formatValue(d.targetValue) }}</td>
                              <td><span class="badge" [class]="d.status==='missing' ? 'bg-warning bg-opacity-10 text-warning' : d.status==='mismatch' ? 'bg-danger bg-opacity-10 text-danger' : 'bg-info bg-opacity-10 text-info'">{{ d.status }}</span></td>
                            </tr>
                          }
                        </tbody>
                      </table>
                      <div class="mt-2">
                        <button class="btn btn-sm btn-outline-primary py-0 px-2 me-1" (click)="syncListing(row.product.id!, cmp.listingId)" [disabled]="busy()">Sync this listing</button>
                        <button class="btn btn-sm btn-outline-danger py-0 px-2" (click)="rollbackListing(cmp)" [disabled]="busy()">Rollback</button>
                      </div>
                    </div>
                  }
                } @else {
                  <div class="px-3 py-2 small text-muted">No diffs — listings are in sync.</div>
                }

                <div class="px-3 py-2 small text-muted border-top">
                  @if (lastSyncMap()[row.product.id!]; as lastSync) {
                    Last synced: {{ formatDate(lastSync.completedAt || lastSync.updatedAt) }}
                    · Status: <span class="badge" [class]="statusBadgeClass(lastSync.status)">{{ lastSync.status }}</span>
                  } @else {
                    Never synced
                  }
                </div>
              </div>
            }
          </div>
        }
      }

      <!-- ======================== SYNC HISTORY ======================== -->
      @if (tab() === 'history') {
        <div class="d-flex gap-2 align-items-center mb-3">
          <select class="form-select form-select-sm" style="width:auto" (change)="historyStatusFilter.set($any($event.target).value)">
            <option value="">All Statuses</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <span class="small text-muted">Total: {{ syncHistory().length }}</span>
        </div>

        @if (!syncHistory().length) {
          <div class="card border-0 shadow-sm"><div class="card-body text-center py-5">
            <p class="text-muted small mb-0">No sync history yet.</p></div></div>
        } @else {
          <div class="table-responsive rounded border">
            <table class="table table-hover align-middle mb-0" style="font-size:.82rem">
              <thead class="table-light">
                <tr><th>Product ID</th><th>Listing ID</th><th>Platform</th><th>Action</th><th>Status</th><th>Attempts</th><th>Started</th><th>Completed</th><th>Error</th><th></th></tr>
              </thead>
              <tbody>
                @for (s of filteredHistory(); track s.id) {
                  <tr (click)="selectedSync.set(s)" style="cursor:pointer">
                    <td class="small text-muted">{{ (s.marketplaceProductId || '').slice(0, 8) }}...</td>
                    <td class="small text-muted">{{ (s.marketplaceListingId || '').slice(0, 8) }}...</td>
                    <td><span class="badge bg-secondary bg-opacity-10 text-secondary">{{ platformLabel(s.platform) }}</span></td>
                    <td><span class="badge bg-info bg-opacity-10 text-info">{{ s.action }}</span></td>
                    <td><span class="badge" [class]="statusBadgeClass(s.status)">{{ s.status }}</span></td>
                    <td>{{ s.attempts }}/{{ s.maxAttempts }}</td>
                    <td class="small text-muted">{{ formatDate(s.startedAt) }}</td>
                    <td class="small text-muted">{{ formatDate(s.completedAt) }}</td>
                    <td class="small text-break" style="max-width:150px">{{ s.errorMessage || '-' }}</td>
                    <td>
                      @if (s.status === 'failed') {
                        <button class="btn btn-sm btn-outline-primary py-0 px-2" (click)="$event.stopPropagation(); retrySync(s.id!)" title="Retry">Retry</button>
                      }
                      @if (s.status === 'pending' || s.status === 'in_progress') {
                        <button class="btn btn-sm btn-outline-danger py-0 px-2" (click)="$event.stopPropagation(); cancelSync(s.id!)" title="Cancel">Cancel</button>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }

        @if (selectedSync(); as sel) {
          <div class="card border-0 shadow-sm mt-3">
            <div class="card-header bg-white fw-semibold small py-2 d-flex justify-content-between">
              <span>Status Timeline · {{ sel.id?.slice(0, 8) }}...</span>
              <button class="btn btn-sm btn-link text-decoration-none p-0 text-muted" (click)="selectedSync.set(null)">&times;</button>
            </div>
            <div class="card-body">
              <div class="d-flex gap-3 mb-2 small align-items-center">
                <span class="text-muted" style="min-width:120px">{{ formatDate(sel.createdAt) }}</span>
                <span class="badge bg-secondary bg-opacity-10 text-secondary">Created</span>
              </div>
              @if (sel.startedAt) {
                <div class="d-flex gap-3 mb-2 small align-items-center">
                  <span class="text-muted" style="min-width:120px">{{ formatDate(sel.startedAt) }}</span>
                  <span class="badge bg-primary bg-opacity-10 text-primary">Started</span>
                </div>
              }
              @if (sel.completedAt) {
                <div class="d-flex gap-3 mb-2 small align-items-center">
                  <span class="text-muted" style="min-width:120px">{{ formatDate(sel.completedAt) }}</span>
                  <span class="badge" [class]="sel.status==='completed' ? 'bg-success bg-opacity-10 text-success' : 'bg-danger bg-opacity-10 text-danger'">{{ sel.status === 'completed' ? 'Completed' : 'Failed' }}</span>
                </div>
              }
              @if (sel.errorMessage) {
                <div class="d-flex gap-3 small">
                  <span class="text-muted" style="min-width:120px">Error</span>
                  <span class="text-danger">{{ sel.errorMessage }}</span>
                </div>
              }
            </div>
          </div>
        }
      }
    </app-marketplace-layout>
  `,
  styles: [`
    .table th{font-size:.72rem;text-transform:uppercase;letter-spacing:.03em;color:#666;white-space:nowrap;padding:.5rem .5rem}
    .table td{padding:.35rem .5rem}
    .nav-tabs .nav-link{border:0;border-bottom:2px solid transparent;color:#666;background:none}
    .nav-tabs .nav-link.active{border-bottom-color:var(--bs-primary);color:var(--bs-primary)}
    .card-header{font-size:.78rem}
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MarketplaceSyncCentreComponent implements OnInit {
  private readonly productSvc = inject(MarketplaceProductService);
  private readonly listingSvc = inject(MarketplaceListingService);
  private readonly syncSvc = inject(MarketplaceSyncService);
  readonly syncEngine = inject(SyncEngineService);
  private readonly auditSvc = inject(SyncAuditService);

  readonly PLATFORMS: MarketplacePlatformType[] = ['amazon', 'flipkart', 'meesho', 'myntra', 'ajio'];

  readonly tab = signal<'overview' | 'comparisons' | 'history'>('overview');
  readonly searchTerm = signal('');
  readonly filterPlatform = signal('');
  readonly filterIssue = signal('');
  readonly historyStatusFilter = signal('');
  readonly error = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);
  readonly loading = signal(false);
  readonly busy = signal(false);
  readonly selectedIds = signal<Set<string>>(new Set());
  readonly selectedSync = signal<MarketplaceSync | null>(null);
  readonly rows = signal<SyncRow[]>([]);
  readonly syncHistory = signal<MarketplaceSync[]>([]);
  readonly recentAudit = signal<SyncAuditEntry[]>([]);
  readonly lastSyncMap = signal<Record<string, MarketplaceSync>>({});

  readonly stats = computed(() => {
    const r = this.rows();
    return {
      totalProducts: r.length,
      missingListings: r.filter(x => !x.listings.length).length,
      missingAi: r.filter(x => x.missingAi).length,
      missingImages: r.filter(x => x.missingImages).length,
      missingAttributes: r.filter(x => x.missingAttributes).length,
      priceMismatches: r.filter(x => x.priceMismatch).length,
      inventoryMismatches: r.filter(x => x.inventoryMismatch).length,
      outdated: r.filter(x => x.outdated).length,
    };
  });

  readonly filtered = computed(() => {
    let list = this.rows();
    const term = this.searchTerm().toLowerCase();
    if (term) list = list.filter(r => r.product.name.toLowerCase().includes(term) || (r.product.brand ?? '').toLowerCase().includes(term));
    const plat = this.filterPlatform();
    if (plat) list = list.filter(r => r.listings.some(l => l.platform === plat) || r.missingListings.includes(plat));
    const issue = this.filterIssue();
    if (issue) {
      switch (issue) {
        case 'missing_listing': list = list.filter(r => !r.listings.length); break;
        case 'missing_ai': list = list.filter(r => r.missingAi); break;
        case 'missing_images': list = list.filter(r => r.missingImages); break;
        case 'missing_attributes': list = list.filter(r => r.missingAttributes); break;
        case 'price_mismatch': list = list.filter(r => r.priceMismatch); break;
        case 'inventory_mismatch': list = list.filter(r => r.inventoryMismatch); break;
        case 'outdated': list = list.filter(r => r.outdated); break;
      }
    }
    return list;
  });

  readonly filteredHistory = computed(() => {
    let list = this.syncHistory();
    const f = this.historyStatusFilter();
    if (f) list = list.filter(s => s.status === f);
    return list;
  });

  readonly failedSyncs = computed(() => this.syncHistory().filter(s => s.status === 'failed'));

  ngOnInit(): void {
    this.refresh();
  }

  async refresh(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    this.selectedIds.set(new Set());
    try {
      await Promise.all([
        this.loadComparisons(),
        this.loadSyncHistory(),
        this.loadRecentAudit(),
      ]);
    } catch (e: any) {
      this.error.set(e?.message || 'Failed to load sync data');
    } finally {
      this.loading.set(false);
    }
  }

  private async loadComparisons(): Promise<void> {
    const productResult = await this.productSvc.getAll({ pageSize: 500, sortField: 'updatedAt', sortDirection: 'desc' });
    const products = productResult.items;

    const allListings: MarketplaceListing[] = [];
    for (const p of products) {
      if (p.id) {
        const ls = await this.listingSvc.getByProductId(p.id);
        allListings.push(...ls);
      }
    }

    const listingsByProduct = new Map<string, MarketplaceListing[]>();
    for (const l of allListings) {
      const arr = listingsByProduct.get(l.marketplaceProductId) || [];
      arr.push(l);
      listingsByProduct.set(l.marketplaceProductId, arr);
    }

    const lastSyncMap: Record<string, MarketplaceSync> = {};
    const syncHistory = this.syncHistory();
    for (const s of syncHistory) {
      if (s.marketplaceProductId && !lastSyncMap[s.marketplaceProductId]) {
        lastSyncMap[s.marketplaceProductId] = s;
      }
    }
    this.lastSyncMap.set(lastSyncMap);

    const rows: SyncRow[] = [];
    const comparator = this.syncEngine['comparator'] as SyncComparatorService;

    for (const product of products) {
      if (!product.id) continue;
      const listings = listingsByProduct.get(product.id) || [];
      const comparisons: ListingComparison[] = [];
      const missingPlatforms: string[] = [];
      let missingAi = false;
      let missingImages = false;
      let missingAttributes = false;
      let priceMismatch = false;
      let inventoryMismatch = false;
      let outdated = false;

      if (!listings.length) {
        rows.push({
          product, listings, comparisons, missingListings: ['amazon', 'flipkart', 'meesho', 'myntra', 'ajio'],
          missingAi: true, missingImages: false, missingAttributes: false, priceMismatch: false, inventoryMismatch: false, outdated: false, _expanded: false,
        });
        continue;
      }

      const listedPlatforms = new Set(listings.map(l => l.platform));
      for (const p of ['amazon', 'flipkart', 'meesho', 'myntra', 'ajio'] as const) {
        if (!listedPlatforms.has(p)) missingPlatforms.push(p);
      }

      for (const listing of listings) {
        const cmp = comparator.compare(product, listing);
        comparisons.push(cmp);

        for (const d of cmp.diffs) {
          switch (d.field) {
            case 'images': missingImages = true; break;
            case 'attributes': missingAttributes = true; break;
            case 'price': priceMismatch = true; break;
            case 'stock': inventoryMismatch = true; break;
          }
        }
      }

      missingAi = listings.some(l => l.aiStatus !== 'completed');

      const prodUpdated = product.updatedAt?.getTime?.() ?? 0;
      outdated = listings.some(l => {
        const listUpdated = l.updatedAt?.getTime?.() ?? 0;
        return prodUpdated > listUpdated;
      });

      rows.push({
        product, listings, comparisons, missingListings: missingPlatforms,
        missingAi, missingImages, missingAttributes,
        priceMismatch, inventoryMismatch, outdated,
        _expanded: false,
      });
    }

    this.rows.set(rows);
  }

  private async loadSyncHistory(): Promise<void> {
    const result = await this.syncSvc.getAll({ pageSize: 100, sortField: 'createdAt', sortDirection: 'desc' });
    this.syncHistory.set(result.items);
  }

  private async loadRecentAudit(): Promise<void> {
    await this.auditSvc.loadRecent();
    this.recentAudit.set(this.auditSvc.recentEntries());
  }

  async runFullSync(): Promise<void> {
    this.error.set(null);
    this.successMessage.set(null);
    this.busy.set(true);
    try {
      const result = await this.syncEngine.syncAll({ conflictStrategy: 'website-wins' });
      this.successMessage.set(`Full sync completed. ${result.length} listing(s) updated.`);
      await this.refresh();
    } catch (e: any) {
      this.error.set(e?.message || 'Full sync failed');
    } finally {
      this.busy.set(false);
    }
  }

  async syncProduct(productId: string): Promise<void> {
    this.busy.set(true);
    this.error.set(null);
    try {
      await this.syncEngine.syncOne(productId, { conflictStrategy: 'website-wins' });
      this.successMessage.set('Sync completed.');
      await this.refresh();
    } catch (e: any) {
      this.error.set(e?.message || 'Sync failed');
    } finally {
      this.busy.set(false);
    }
  }

  async syncListing(productId: string, _listingId: string): Promise<void> {
    this.busy.set(true);
    this.error.set(null);
    try {
      await this.syncEngine.syncOne(productId, { conflictStrategy: 'website-wins' });
      this.successMessage.set('Listing synced.');
      await this.refresh();
    } catch (e: any) {
      this.error.set(e?.message || 'Sync failed');
    } finally {
      this.busy.set(false);
    }
  }

  async bulkSync(): Promise<void> {
    const ids = [...this.selectedIds()];
    if (!ids.length) return;
    this.busy.set(true);
    this.error.set(null);
    try {
      await this.syncEngine.syncMany(ids, { conflictStrategy: 'website-wins', scope: 'many' });
      this.successMessage.set(`Synced ${ids.length} product(s).`);
      this.clearSelection();
      await this.refresh();
    } catch (e: any) {
      this.error.set(e?.message || 'Bulk sync failed');
    } finally {
      this.busy.set(false);
    }
  }

  async rollbackListing(cmp: ListingComparison): Promise<void> {
    this.busy.set(true);
    this.error.set(null);
    try {
      await this.syncEngine.rollback([cmp]);
      this.successMessage.set('Rollback completed.');
      await this.refresh();
    } catch (e: any) {
      this.error.set(e?.message || 'Rollback failed');
    } finally {
      this.busy.set(false);
    }
  }

  async retrySync(id: string): Promise<void> {
    this.error.set(null);
    this.successMessage.set(null);
    try {
      await this.syncSvc.retrySync(id);
      this.successMessage.set('Sync queued for retry.');
      await this.loadSyncHistory();
    } catch (e: any) {
      this.error.set(e?.message || 'Retry failed');
    }
  }

  async cancelSync(id: string): Promise<void> {
    this.error.set(null);
    try {
      await this.syncSvc.cancelSync(id);
      this.successMessage.set('Sync cancelled.');
      await this.loadSyncHistory();
    } catch (e: any) {
      this.error.set(e?.message || 'Cancel failed');
    }
  }

  async retryAllFailed(): Promise<void> {
    const failed = this.failedSyncs();
    if (!failed.length) return;
    this.busy.set(true);
    this.error.set(null);
    try {
      const ids = failed.map(s => s.id!).filter(Boolean) as string[];
      await this.syncSvc.bulkRetry(ids);
      this.successMessage.set(`Retrying ${ids.length} failed sync(s).`);
      await this.loadSyncHistory();
    } catch (e: any) {
      this.error.set(e?.message || 'Bulk retry failed');
    } finally {
      this.busy.set(false);
    }
  }

  navTo(tab: 'overview' | 'comparisons' | 'history', issue: string): void {
    this.tab.set(tab);
    this.filterIssue.set(issue);
  }

  toggleSelect(id: string): void {
    this.selectedIds.update(s => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  clearSelection(): void {
    this.selectedIds.set(new Set());
  }

  onSearch(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
  }

  platformLabel(p: string): string {
    return (MARKETPLACE_LABELS as Record<string, string>)[p] || p;
  }

  formatDate(d: Date | string | undefined): string {
    if (!d) return '-';
    const dt = typeof d === 'string' ? new Date(d) : d;
    return dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  formatValue(v: unknown): string {
    if (v === null || v === undefined) return '-';
    if (Array.isArray(v)) return v.length ? v.join(', ') : '-';
    return String(v);
  }

  statusBadgeClass(s: string): string {
    const m: Record<string, string> = {
      completed: 'bg-success bg-opacity-10 text-success',
      failed: 'bg-danger bg-opacity-10 text-danger',
      pending: 'bg-warning bg-opacity-10 text-warning',
      in_progress: 'bg-info bg-opacity-10 text-info',
      cancelled: 'bg-secondary bg-opacity-10 text-secondary',
    };
    return m[s] || 'bg-secondary bg-opacity-10 text-secondary';
  }
}
