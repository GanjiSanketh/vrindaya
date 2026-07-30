import { Component, signal, computed, inject, ChangeDetectionStrategy, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MarketplaceLayoutComponent } from '../../layouts/marketplace-layout.component';
import { InventoryAutomationService } from '../../services/inventory/inventory-automation.service';
import type { MarketplaceListing } from '../../models/marketplace-listing.model';
import type { InventoryNotification } from '../../models/inventory-automation.model';

type Tab = 'overview' | 'stock' | 'warehouses' | 'notifications' | 'jobs';

@Component({
  selector: 'app-inventory-automation',
  standalone: true,
  imports: [CommonModule, FormsModule, MarketplaceLayoutComponent],
  template: `
    <app-marketplace-layout title="Inventory Automation" subtitle="Monitor stock levels, manage warehouses, and automate marketplace inventory sync.">
      <div actions class="d-flex gap-2">
        <button class="btn btn-sm btn-outline-primary" (click)="checkLowStock()" [disabled]="loading()">
          Low Stock Check
        </button>
        <button class="btn btn-sm btn-outline-secondary" (click)="syncAllStock()" [disabled]="loading()">
          Sync All Stock
        </button>
        <button class="btn btn-sm btn-outline-info" (click)="reload()" [disabled]="loading()">
          Refresh
        </button>
      </div>

      @if (error(); as e) {
        <div class="alert alert-danger py-2 small border-0 d-flex justify-content-between align-items-center mb-3">{{ e }}<button class="btn btn-sm btn-link text-decoration-none text-danger p-0" (click)="error.set(null)">&times;</button></div>
      }

      <!-- Summary Cards -->
      <div class="row g-2 mb-3">
        <div class="col-6 col-md-4 col-lg-2" (click)="activeTab.set('overview')" style="cursor:pointer">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-body p-3 text-center">
              <div class="small text-muted">Total Listings</div>
              <div class="fw-bold fs-5 mt-1">{{ summary().totalListings }}</div>
            </div>
          </div>
        </div>
        <div class="col-6 col-md-4 col-lg-2" (click)="activeTab.set('stock')" style="cursor:pointer">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-body p-3 text-center">
              <div class="small text-muted">Total Stock</div>
              <div class="fw-bold fs-5 mt-1">{{ summary().totalStock | number }}</div>
            </div>
          </div>
        </div>
        <div class="col-6 col-md-4 col-lg-2" (click)="activeTab.set('stock')" style="cursor:pointer">
          <div class="card border-0 shadow-sm h-100 border-start border-success border-3">
            <div class="card-body p-3 text-center">
              <div class="small text-muted">Low Stock</div>
              <div class="fw-bold fs-5 mt-1 text-warning">{{ summary().lowStockCount }}</div>
            </div>
          </div>
        </div>
        <div class="col-6 col-md-4 col-lg-2" (click)="activeTab.set('stock')" style="cursor:pointer">
          <div class="card border-0 shadow-sm h-100 border-start border-danger border-3">
            <div class="card-body p-3 text-center">
              <div class="small text-muted">Out of Stock</div>
              <div class="fw-bold fs-5 mt-1 text-danger">{{ summary().outOfStockCount }}</div>
            </div>
          </div>
        </div>
        <div class="col-6 col-md-4 col-lg-2" (click)="activeTab.set('warehouses')" style="cursor:pointer">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-body p-3 text-center">
              <div class="small text-muted">Warehouses</div>
              <div class="fw-bold fs-5 mt-1">{{ summary().warehouseCount }}</div>
            </div>
          </div>
        </div>
        <div class="col-6 col-md-4 col-lg-2" (click)="activeTab.set('stock')" style="cursor:pointer">
          <div class="card border-0 shadow-sm h-100 border-start border-info border-3">
            <div class="card-body p-3 text-center">
              <div class="small text-muted">Buffer Zone</div>
              <div class="fw-bold fs-5 mt-1 text-info">{{ summary().bufferStockCount }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Tab Nav -->
      <ul class="nav nav-tabs border-0 gap-0 mb-3" style="border-bottom:1px solid #e5e7eb">
        @for (t of tabs; track t.key) {
          <li class="nav-item">
            <button class="nav-link border-0 px-3 py-2 small" [class]="activeTab() === t.key ? 'active fw-semibold' : 'text-muted'"
              (click)="activeTab.set(t.key)" style="font-size:.82rem">
              {{ t.label }}
              @if (t.key === 'notifications' && unreadNotifs() > 0) {
                <span class="badge bg-danger ms-1" style="font-size:.6rem">{{ unreadNotifs() }}</span>
              }
            </button>
          </li>
        }
      </ul>

      <!-- Overview Tab -->
      @if (activeTab() === 'overview') {
        <div class="row g-3">
          <div class="col-md-6">
            <div class="card border-0 shadow-sm">
              <div class="card-header bg-white py-2 fw-semibold small">Stock Status Distribution</div>
              <div class="card-body p-3">
                <div class="d-flex gap-4 justify-content-center py-3">
                  <div class="text-center">
                    <div class="fw-bold fs-3 text-success">{{ stockStatusCount('in_stock') }}</div>
                    <div class="small text-muted">In Stock</div>
                  </div>
                  <div class="text-center">
                    <div class="fw-bold fs-3 text-warning">{{ stockStatusCount('low_stock') }}</div>
                    <div class="small text-muted">Low Stock</div>
                  </div>
                  <div class="text-center">
                    <div class="fw-bold fs-3 text-danger">{{ stockStatusCount('out_of_stock') }}</div>
                    <div class="small text-muted">Out of Stock</div>
                  </div>
                  <div class="text-center">
                    <div class="fw-bold fs-3 text-secondary">{{ stockStatusCount('unknown') }}</div>
                    <div class="small text-muted">Unknown</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="col-md-6">
            <div class="card border-0 shadow-sm">
              <div class="card-header bg-white py-2 fw-semibold small">Stock Levels</div>
              <div class="card-body p-3">
                <div class="row g-2 text-center">
                  <div class="col-4">
                    <div class="fw-bold fs-5">{{ summary().totalStock | number }}</div>
                    <div class="small text-muted">Available</div>
                  </div>
                  <div class="col-4">
                    <div class="fw-bold fs-5">{{ summary().totalReserved | number }}</div>
                    <div class="small text-muted">Reserved</div>
                  </div>
                  <div class="col-4">
                    <div class="fw-bold fs-5">{{ summary().totalIncoming | number }}</div>
                    <div class="small text-muted">Incoming</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        @if (lowStockItems().length) {
          <div class="card border-0 shadow-sm mt-3">
            <div class="card-header bg-white py-2 fw-semibold small d-flex justify-content-between">
              <span>Low Stock & Out of Stock Items</span>
              <span class="badge bg-warning bg-opacity-10 text-warning">{{ lowStockItems().length }}</span>
            </div>
            <div class="list-group list-group-flush" style="max-height:320px;overflow-y:auto">
              @for (l of lowStockItems(); track l.id) {
                <div class="list-group-item px-3 py-2 d-flex justify-content-between align-items-center">
                  <div class="d-flex align-items-center gap-2">
                    <span class="badge" [class]="l.inventory.stockStatus === 'out_of_stock' ? 'bg-danger bg-opacity-10 text-danger' : 'bg-warning bg-opacity-10 text-warning'" style="font-size:.65rem">
                      {{ l.inventory.stockStatus === 'out_of_stock' ? 'OOS' : 'LOW' }}
                    </span>
                    <div>
                      <div class="small fw-medium">{{ l.marketplaceTitle || l.marketplaceSku }}</div>
                      <div class="small text-muted" style="font-size:.7rem">{{ l.platform }} &middot; {{ l.inventory.warehouseLocation || 'No warehouse' }} &middot; Threshold: {{ l.inventory.lowStockThreshold }}</div>
                    </div>
                  </div>
                  <div class="text-end">
                    <div class="fw-medium" [class.text-danger]="l.inventory.stockStatus === 'out_of_stock'" [class.text-warning]="l.inventory.stockStatus === 'low_stock'">
                      {{ l.inventory.availableStock }}
                    </div>
                    <div class="small text-muted" style="font-size:.65rem">of {{ l.inventory.totalStock }}</div>
                  </div>
                </div>
              }
            </div>
          </div>
        }
      }

      <!-- Stock Levels Tab -->
      @if (activeTab() === 'stock') {
        <div class="card border-0 shadow-sm">
          <div class="card-header bg-white py-2 d-flex justify-content-between align-items-center">
            <div class="d-flex gap-2 align-items-center">
              <span class="fw-semibold small">All Inventory Levels</span>
              <select class="form-select form-select-sm" style="width:auto" [(ngModel)]="stockFilter">
                <option value="all">All</option>
                <option value="low">Low Stock</option>
                <option value="oos">Out of Stock</option>
                <option value="buffer">Buffer Zone</option>
                <option value="normal">In Stock</option>
              </select>
            </div>
            <span class="badge bg-secondary bg-opacity-10 text-secondary">{{ filteredListings().length }}</span>
          </div>
          <div class="table-responsive" style="max-height:480px;overflow-y:auto">
            <table class="table table-hover align-middle mb-0" style="font-size:.78rem">
              <thead class="table-light" style="position:sticky;top:0;z-index:1">
                <tr>
                  <th class="ps-3">SKU / Title</th>
                  <th>Platform</th>
                  <th>Total</th>
                  <th>Available</th>
                  <th>Reserved</th>
                  <th>Incoming</th>
                  <th>Damaged</th>
                  <th>Threshold</th>
                  <th>Status</th>
                  <th>Warehouse</th>
                  <th class="pe-3">Last Counted</th>
                </tr>
              </thead>
              <tbody>
                @for (l of filteredListings(); track l.id) {
                  <tr>
                    <td class="ps-3">
                      <div class="fw-medium">{{ l.marketplaceTitle || l.marketplaceSku }}</div>
                      <div class="text-muted" style="font-size:.65rem">{{ l.marketplaceSku }}</div>
                    </td>
                    <td><span class="badge bg-light text-dark" style="font-size:.65rem">{{ l.platform }}</span></td>
                    <td>{{ l.inventory.totalStock }}</td>
                    <td>
                      <span [class.text-danger]="l.inventory.availableStock === 0"
                            [class.text-warning]="l.inventory.availableStock > 0 && l.inventory.availableStock <= l.inventory.lowStockThreshold">
                        {{ l.inventory.availableStock }}
                      </span>
                    </td>
                    <td>{{ l.inventory.reservedStock }}</td>
                    <td>{{ l.inventory.incomingStock }}</td>
                    <td>{{ l.inventory.damagedStock }}</td>
                    <td>{{ l.inventory.lowStockThreshold }}</td>
                    <td>
                      <span class="badge" [class]="statusBadgeClass(l.inventory.stockStatus)">{{ l.inventory.stockStatus || 'unknown' }}</span>
                    </td>
                    <td><span class="small">{{ l.inventory.warehouseLocation || '-' }}</span></td>
                    <td class="pe-3">{{ l.inventory.lastCountedAt ? dateStr(l.inventory.lastCountedAt) : '-' }}</td>
                  </tr>
                } @empty {
                  <tr><td colspan="11" class="text-center text-muted py-4 small">No listings found</td></tr>
                }
              </tbody>
            </table>
          </div>
        </div>

        @if (selectedListing(); as sel) {
          <div class="card border-0 shadow-sm mt-3">
            <div class="card-header bg-white py-2 fw-semibold small d-flex justify-content-between">
              <span>Quick Actions: {{ sel.marketplaceTitle || sel.marketplaceSku }}</span>
              <button class="btn btn-sm btn-link text-decoration-none p-0" (click)="selectedListing.set(null)">&times;</button>
            </div>
            <div class="card-body p-3">
              <div class="row g-2 align-items-end">
                <div class="col-auto">
                  <label class="small text-muted mb-1">Adjust Available Stock</label>
                  <div class="input-group input-group-sm">
                    <input type="number" class="form-control" style="width:100px" [(ngModel)]="adjustQty" placeholder="Qty" />
                    <button class="btn btn-outline-primary" (click)="adjustStock(sel, adjustQty())">Set</button>
                  </div>
                </div>
                <div class="col-auto">
                  <label class="small text-muted mb-1">Reserve Stock</label>
                  <div class="input-group input-group-sm">
                    <input type="number" class="form-control" style="width:100px" [(ngModel)]="reserveQty" placeholder="Qty" />
                    <button class="btn btn-outline-warning" (click)="reserveStock(sel, reserveQty())">Reserve</button>
                  </div>
                </div>
                <div class="col-auto">
                  <button class="btn btn-sm btn-outline-info mt-3" (click)="syncStockToMp(sel)">Sync to Marketplace</button>
                </div>
              </div>
              @if (actionMsg(); as m) {
                <div class="alert alert-{{ m.type }} py-1 small mt-2 mb-0">{{ m.text }}</div>
              }
            </div>
          </div>
        }
      }

      <!-- Warehouses Tab -->
      @if (activeTab() === 'warehouses') {
        <div class="row g-3">
          @for (w of warehouses(); track w.name) {
            <div class="col-md-6 col-lg-4">
              <div class="card border-0 shadow-sm h-100">
                <div class="card-header bg-white py-2 d-flex justify-content-between">
                  <span class="fw-semibold small">{{ w.name || 'Unassigned' }}</span>
                  <span class="badge bg-secondary bg-opacity-10 text-secondary">{{ w.count }}</span>
                </div>
                <div class="card-body p-3">
                  <div class="d-flex gap-3 mb-2">
                    <div class="small"><span class="text-muted">Total:</span> <strong>{{ w.totalStock }}</strong></div>
                    <div class="small"><span class="text-muted">Available:</span> <strong>{{ w.availableStock }}</strong></div>
                    <div class="small"><span class="text-muted">Reserved:</span> <strong>{{ w.reservedStock }}</strong></div>
                  </div>
                  <div class="list-group list-group-flush" style="max-height:200px;overflow-y:auto">
                    @for (l of w.items; track l.id) {
                      <div class="list-group-item px-0 py-1 d-flex justify-content-between align-items-center border-0">
                        <div class="small text-truncate me-2" style="max-width:180px">{{ l.marketplaceTitle || l.marketplaceSku }}</div>
                        <span class="badge" [class]="statusBadgeClass(l.inventory.stockStatus)" style="font-size:.6rem">{{ l.inventory.availableStock }}</span>
                      </div>
                    }
                  </div>
                </div>
              </div>
            </div>
          } @empty {
            <div class="col-12">
              <div class="card border-0 shadow-sm">
                <div class="card-body text-center py-4 text-muted small">No warehouse data available.</div>
              </div>
            </div>
          }
        </div>
      }

      <!-- Notifications Tab -->
      @if (activeTab() === 'notifications') {
        <div class="card border-0 shadow-sm">
          <div class="card-header bg-white py-2 d-flex justify-content-between align-items-center">
            <span class="fw-semibold small">Notifications</span>
            <div class="d-flex gap-2">
              @if (unreadNotifs() > 0) {
                <button class="btn btn-sm btn-link text-decoration-none p-0 small" (click)="markAllRead()">Mark All Read</button>
              }
              <span class="badge bg-secondary bg-opacity-10 text-secondary">{{ notifications().length }}</span>
            </div>
          </div>
          <div class="list-group list-group-flush" style="max-height:500px;overflow-y:auto">
            @for (n of notifications(); track n.id) {
              <div class="list-group-item px-3 py-2 d-flex justify-content-between align-items-center"
                [class.bg-light]="!n.read">
                <div class="d-flex align-items-center gap-2">
                  @if (!n.read) { <span class="badge bg-primary p-1 rounded-circle" style="width:6px;height:6px"></span> }
                  <div>
                    <div class="small fw-medium">{{ n.productName }}</div>
                    <div class="small text-muted" style="font-size:.7rem">{{ n.message }}</div>
                    <div class="small text-muted" style="font-size:.65rem">{{ dateStr(n.createdAt) }} &middot; {{ n.type }}</div>
                  </div>
                </div>
                <div class="d-flex align-items-center gap-1">
                  <span class="badge" [class]="notifBadgeClass(n.type)">{{ n.type }}</span>
                  @if (!n.read) {
                    <button class="btn btn-sm btn-link text-decoration-none p-0 text-muted" (click)="markRead(n)" title="Mark read">&#10003;</button>
                  }
                </div>
              </div>
            } @empty {
              <div class="list-group-item text-center text-muted py-4 small">No notifications.</div>
            }
          </div>
        </div>
      }

      <!-- Jobs Tab -->
      @if (activeTab() === 'jobs') {
        <div class="row g-3">
          <div class="col-12">
            <div class="card border-0 shadow-sm">
              <div class="card-header bg-white py-2 fw-semibold small">Stock Change Log</div>
              <div class="table-responsive" style="max-height:400px;overflow-y:auto">
                <table class="table table-hover align-middle mb-0" style="font-size:.75rem">
                  <thead class="table-light" style="position:sticky;top:0;z-index:1">
                    <tr>
                      <th class="ps-3">Date</th>
                      <th>Type</th>
                      <th>Platform</th>
                      <th>Prev</th>
                      <th>New</th>
                      <th>Change</th>
                      <th>Warehouse</th>
                      <th class="pe-3">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (log of stockLogs(); track log.id) {
                      <tr>
                        <td class="ps-3">{{ dateStr(log.createdAt) }}</td>
                        <td><span class="badge" [class]="logTypeBadge(log.type)">{{ log.type }}</span></td>
                        <td><span class="badge bg-light text-dark" style="font-size:.65rem">{{ log.platform }}</span></td>
                        <td>{{ log.previousStock }}</td>
                        <td>{{ log.newStock }}</td>
                        <td>
                          <span [class.text-success]="log.change > 0" [class.text-danger]="log.change < 0">
                            {{ log.change > 0 ? '+' : '' }}{{ log.change }}
                          </span>
                        </td>
                        <td>{{ log.warehouseLocation || '-' }}</td>
                        <td class="pe-3 small text-muted">{{ log.notes || '-' }}</td>
                      </tr>
                    } @empty {
                      <tr><td colspan="8" class="text-center text-muted py-4 small">No stock logs.</td></tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          <div class="col-12">
            <div class="card border-0 shadow-sm">
              <div class="card-header bg-white py-2 d-flex justify-content-between align-items-center">
                <span class="fw-semibold small">Background Jobs</span>
                <div class="d-flex gap-2">
                  @if (pendingJobs()) {
                    <button class="btn btn-sm btn-outline-danger" (click)="cancelPendingJobs()">Cancel Pending</button>
                  }
                  <span class="badge bg-secondary bg-opacity-10 text-secondary">{{ jobs().length }}</span>
                </div>
              </div>
              <div class="list-group list-group-flush" style="max-height:400px;overflow-y:auto">
                @for (j of jobs(); track j.id) {
                  <div class="list-group-item px-3 py-2">
                    <div class="d-flex justify-content-between align-items-center">
                      <div>
                        <span class="fw-medium small">{{ j.type }}</span>
                        @if (j.platform) {
                          <span class="badge bg-light text-dark ms-1" style="font-size:.6rem">{{ j.platform }}</span>
                        }
                        <span class="ms-2 badge" [class]="jobBadgeClass(j.status)">{{ j.status }}</span>
                      </div>
                      <div class="small text-muted">{{ dateStr(j.createdAt) }}</div>
                    </div>
                    @if (j.status === 'running') {
                      <div class="progress mt-1" style="height:4px">
                        <div class="progress-bar progress-bar-striped progress-bar-animated" [style.width.%]="j.progress"></div>
                      </div>
                    }
                    @if (j.result; as r) {
                      <div class="small text-success mt-1" style="font-size:.7rem">{{ r.details }}</div>
                    }
                    @if (j.error) {
                      <div class="small text-danger mt-1" style="font-size:.7rem">{{ j.error }}</div>
                    }
                  </div>
                } @empty {
                  <div class="list-group-item text-center text-muted py-4 small">No jobs found.</div>
                }
              </div>
            </div>
          </div>
        </div>
      }
    </app-marketplace-layout>
  `,
  styles: [`
    .nav-tabs .nav-link.active{color:#1a1a2e;border-bottom:2px solid #4a90d9 !important;background:transparent}
    .nav-tabs .nav-link:hover:not(.active){background:#f5f5f8}
    .table th{font-size:.7rem;font-weight:600;color:#666;text-transform:uppercase;letter-spacing:.03em}
    .table td{vertical-align:middle}
    .list-group-item.active{background:#f0f4ff;border-color:#e0e8f0}
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InventoryAutomationComponent implements OnDestroy {
  private readonly svc = inject(InventoryAutomationService);

  readonly allListings = this.svc.allListings;
  readonly loading = this.svc.loading;
  readonly error = this.svc.error;
  readonly summary = this.svc.summary;
  readonly lowStockItems = this.svc.lowStockListings;
  readonly stockLogs = this.svc.stockLogs;
  readonly notifications = this.svc.notifications;
  readonly jobs = this.svc.jobs;

  readonly tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'stock', label: 'Stock Levels' },
    { key: 'warehouses', label: 'Warehouses' },
    { key: 'notifications', label: 'Notifications' },
    { key: 'jobs', label: 'Jobs & History' },
  ];
  readonly activeTab = signal<Tab>('overview');
  readonly stockFilter = signal<string>('all');
  readonly selectedListing = signal<MarketplaceListing | null>(null);
  readonly adjustQty = signal(0);
  readonly reserveQty = signal(0);
  readonly actionMsg = signal<{ type: string; text: string } | null>(null);

  readonly unreadNotifs = computed(() => this.notifications().filter(n => !n.read).length);
  readonly pendingJobs = computed(() => this.jobs().filter(j => j.status === 'pending' || j.status === 'running').length);

  readonly filteredListings = computed(() => {
    const items = this.allListings();
    const f = this.stockFilter();
    switch (f) {
      case 'low': return items.filter(l => l.inventory.stockStatus === 'low_stock');
      case 'oos': return items.filter(l => l.inventory.stockStatus === 'out_of_stock');
      case 'buffer': return items.filter(l => {
        const inv = l.inventory;
        return inv?.availableStock !== undefined && inv?.lowStockThreshold !== undefined && inv.availableStock > 0 && inv.availableStock <= inv.lowStockThreshold * 1.5;
      });
      case 'normal': return items.filter(l => l.inventory.stockStatus === 'in_stock');
      default: return items;
    }
  });

  readonly warehouses = computed(() => {
    const map = new Map<string, { name: string; count: number; totalStock: number; availableStock: number; reservedStock: number; items: MarketplaceListing[] }>();
    for (const l of this.allListings()) {
      const w = l.inventory.warehouseLocation || 'Unassigned';
      if (!map.has(w)) map.set(w, { name: w, count: 0, totalStock: 0, availableStock: 0, reservedStock: 0, items: [] });
      const g = map.get(w)!;
      g.count++;
      g.totalStock += l.inventory.totalStock ?? 0;
      g.availableStock += l.inventory.availableStock ?? 0;
      g.reservedStock += l.inventory.reservedStock ?? 0;
      g.items.push(l);
    }
    return [...map.values()];
  });

  constructor() {
    this.svc.loadAll();
  }

  stockStatusCount(status: string): number {
    return this.allListings().filter(l => (l.inventory.stockStatus || 'unknown') === status).length;
  }

  statusBadgeClass(s?: string): string {
    const map: Record<string, string> = {
      in_stock: 'bg-success bg-opacity-10 text-success',
      low_stock: 'bg-warning bg-opacity-10 text-warning',
      out_of_stock: 'bg-danger bg-opacity-10 text-danger',
    };
    return map[s || ''] || 'bg-secondary bg-opacity-10 text-secondary';
  }

  notifBadgeClass(t: string): string {
    const map: Record<string, string> = {
      low_stock: 'bg-warning bg-opacity-10 text-warning',
      out_of_stock: 'bg-danger bg-opacity-10 text-danger',
      restock: 'bg-success bg-opacity-10 text-success',
      buffer_exceeded: 'bg-info bg-opacity-10 text-info',
      sync_failed: 'bg-danger bg-opacity-10 text-danger',
    };
    return map[t] || 'bg-secondary bg-opacity-10 text-secondary';
  }

  logTypeBadge(t: string): string {
    const map: Record<string, string> = {
      sale: 'bg-danger bg-opacity-10 text-danger',
      return: 'bg-success bg-opacity-10 text-success',
      restock: 'bg-info bg-opacity-10 text-info',
      adjustment: 'bg-warning bg-opacity-10 text-warning',
      damage: 'bg-danger bg-opacity-10 text-danger',
      reservation: 'bg-primary bg-opacity-10 text-primary',
      release: 'bg-success bg-opacity-10 text-success',
      sync: 'bg-secondary bg-opacity-10 text-secondary',
    };
    return map[t] || 'bg-secondary bg-opacity-10 text-secondary';
  }

  jobBadgeClass(s: string): string {
    const map: Record<string, string> = {
      pending: 'bg-secondary bg-opacity-10 text-secondary',
      running: 'bg-primary bg-opacity-10 text-primary',
      completed: 'bg-success bg-opacity-10 text-success',
      failed: 'bg-danger bg-opacity-10 text-danger',
      cancelled: 'bg-warning bg-opacity-10 text-warning',
    };
    return map[s] || 'bg-secondary bg-opacity-10 text-secondary';
  }

  async adjustStock(listing: MarketplaceListing, qty: number): Promise<void> {
    if (qty < 0) { this.actionMsg.set({ type: 'danger', text: 'Quantity must be >= 0' }); return; }
    try {
      await this.svc.updateListingStock(listing, { availableStock: qty });
      await this.reload();
      this.actionMsg.set({ type: 'success', text: `Stock updated to ${qty}` });
    } catch (e: any) {
      this.actionMsg.set({ type: 'danger', text: e?.message || 'Failed to update stock' });
    }
  }

  async reserveStock(listing: MarketplaceListing, qty: number): Promise<void> {
    if (qty <= 0) { this.actionMsg.set({ type: 'danger', text: 'Quantity must be > 0' }); return; }
    try {
      await this.svc.reserveStock(listing, qty);
      await this.reload();
      this.actionMsg.set({ type: 'success', text: `Reserved ${qty} units` });
    } catch (e: any) {
      this.actionMsg.set({ type: 'danger', text: e?.message || 'Failed to reserve stock' });
    }
  }

  async syncStockToMp(listing: MarketplaceListing): Promise<void> {
    try {
      await this.svc.syncStockToMarketplace(listing);
      this.actionMsg.set({ type: 'success', text: 'Stock sync queued' });
    } catch (e: any) {
      this.actionMsg.set({ type: 'danger', text: e?.message || 'Sync failed' });
    }
  }

  async syncAllStock(): Promise<void> {
    this.loading.set(true);
    try {
      await this.svc.syncAllListings();
      await this.reload();
    } catch (e: any) {
      this.error.set(e?.message || 'Sync failed');
    } finally {
      this.loading.set(false);
    }
  }

  async checkLowStock(): Promise<void> {
    this.loading.set(true);
    try {
      await this.svc.checkLowStock();
      await this.reload();
    } catch (e: any) {
      this.error.set(e?.message || 'Check failed');
    } finally {
      this.loading.set(false);
    }
  }

  async markRead(n: InventoryNotification): Promise<void> {
    if (n.id) {
      await this.svc.markNotifRead(n.id);
    }
  }

  async markAllRead(): Promise<void> {
    await this.svc.markAllNotifsRead();
  }

  async cancelPendingJobs(): Promise<void> {
    // In a real implementation, we'd cancel pending jobs
  }

  async reload(): Promise<void> {
    await this.svc.loadAll();
  }

  selectListing(l: MarketplaceListing): void {
    this.selectedListing.set(l);
    this.adjustQty.set(l.inventory.availableStock ?? 0);
    this.reserveQty.set(0);
    this.actionMsg.set(null);
  }

  dateStr(d: any): string {
    if (!d) return '';
    const date = d?.toDate?.() ?? d instanceof Date ? d : new Date(d);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  }

  ngOnDestroy(): void {
    // Clean up
  }
}
