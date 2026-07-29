import { Component, OnInit, signal, inject, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MarketplaceLayoutComponent } from '../../layouts/marketplace-layout.component';
import { MarketplaceProductService } from '../../services/marketplace-product.service';
import { MarketplaceListingService } from '../../services/marketplace-listing.service';
import { SyncEngineService } from '../../services/sync/sync-engine.service';
import type { MarketplaceProduct } from '../../models/marketplace-product.model';
import type { MarketplaceListing, AiStatus, ListingStatus } from '../../models/marketplace-listing.model';
import type { MarketplacePlatformType, PublishStatus } from '../../models/marketplace-platform.model';
import { MARKETPLACE_LABELS } from '../../models/marketplace-platform.model';

interface ProductRowData {
  product: MarketplaceProduct;
  listings: MarketplaceListing[];
  imageUrl: string;
  platforms: MarketplacePlatformType[];
  aiStatus: AiStatus;
  listingStatus: ListingStatus;
  publishStatus: PublishStatus;
  marketplaceStatus: string;
  mrp: number;
  sellingPrice: number;
  stock: number;
}

interface BulkUpdateForm {
  price: { apply: boolean; value: number };
  stock: { apply: boolean; value: number };
  hsn: { apply: boolean; value: string };
  gst: { apply: boolean; value: number };
  country: { apply: boolean; value: string };
  packageContents: { apply: boolean; value: string };
  description: { apply: boolean; value: string };
  seoKeywords: { apply: boolean; value: string };
  marketplaceStatus: { apply: boolean; value: string };
}

interface UndoEntry {
  type: 'update' | 'archive' | 'restore' | 'delete';
  productIds: string[];
  products: { id: string; data: Record<string, unknown> }[];
  listings: { id: string; data: Record<string, unknown> }[];
}

type ConfirmAction = 'archive' | 'restore' | 'delete' | null;
type SortField = 'name' | 'brand' | 'category' | 'websiteStatus' | 'platforms' | 'aiStatus' | 'marketplaceStatus' | 'listingStatus' | 'mrp' | 'sellingPrice' | 'stock' | 'updatedAt';
type SortDir = 'asc' | 'desc';

const LISTING_STATUS_ORDER: Record<string, number> = { active: 0, inactive: 1, draft: 2, pending: 3, blocked: 4, rejected: 5 };
const AI_STATUS_ORDER: Record<string, number> = { not_applicable: 0, completed: 1, pending: 2, processing: 3, failed: 4 };
const PUBLISH_STATUS_ORDER: Record<string, number> = { published: 0, pending_review: 1, draft: 2, unpublished: 3, suspended: 4 };

@Component({
  selector: 'app-marketplace-products',
  standalone: true,
  imports: [CommonModule, FormsModule, MarketplaceLayoutComponent, DatePipe],
  template: `
    <app-marketplace-layout title="Marketplace Products" subtitle="Manage product details and platform listings.">
      <div actions class="d-flex gap-2 align-items-center">
        <button class="btn btn-sm btn-outline-primary" (click)="clearFilters()">Clear Filters</button>
      </div>
      <div class="d-flex gap-2 mb-3 flex-wrap align-items-center">
        <div class="input-group" style="min-width:200px;max-width:260px">
          <span class="input-group-text bg-white border-end-0"><svg width="16" height="16" fill="none" stroke="#888" stroke-width="2"><circle cx="7" cy="7" r="5"/><path d="m11 11 3 3"/></svg></span>
          <input type="text" class="form-control border-start-0" placeholder="Search..." [ngModel]="searchTerm()" (ngModelChange)="searchTerm.set($event);currentPage.set(1)" />
        </div>
        <select class="form-select form-select-sm" style="width:auto;min-width:110px" [ngModel]="statusFilter()" (ngModelChange)="statusFilter.set($event);currentPage.set(1)">
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="draft">Draft</option>
          <option value="archived">Archived</option>
        </select>
        <select class="form-select form-select-sm" style="width:auto;min-width:120px" [ngModel]="categoryFilter()" (ngModelChange)="categoryFilter.set($event);currentPage.set(1)">
          <option value="">All Categories</option>
          @for (c of uniqueCategories(); track c) { <option [value]="c">{{ c }}</option> }
        </select>
        <select class="form-select form-select-sm" style="width:auto;min-width:110px" [ngModel]="brandFilter()" (ngModelChange)="brandFilter.set($event);currentPage.set(1)">
          <option value="">All Brands</option>
          @for (b of uniqueBrands(); track b) { <option [value]="b">{{ b }}</option> }
        </select>
        <select class="form-select form-select-sm" style="width:auto;min-width:110px" [ngModel]="platformFilter()" (ngModelChange)="platformFilter.set($event);currentPage.set(1)">
          <option value="">All Platforms</option>
          @for (p of platforms; track p) { <option [value]="p">{{ labels[p] }}</option> }
        </select>
        <select class="form-select form-select-sm" style="width:auto;min-width:100px" [ngModel]="aiStatusFilter()" (ngModelChange)="aiStatusFilter.set($event);currentPage.set(1)">
          <option value="">All AI</option>
          <option value="completed">Completed</option>
          <option value="pending">Pending</option>
          <option value="processing">Processing</option>
          <option value="failed">Failed</option>
          <option value="not_applicable">N/A</option>
        </select>
        <select class="form-select form-select-sm" style="width:auto;min-width:110px" [ngModel]="publishStatusFilter()" (ngModelChange)="publishStatusFilter.set($event);currentPage.set(1)">
          <option value="">All Pub. Status</option>
          <option value="published">Published</option>
          <option value="pending_review">Pending Review</option>
          <option value="draft">Draft</option>
          <option value="unpublished">Unpublished</option>
          <option value="suspended">Suspended</option>
        </select>
        @if (hasActiveFilters()) {
          <button class="btn btn-sm btn-link text-decoration-none text-danger px-2" (click)="clearFilters()">Clear</button>
        }
      </div>
      @if (selectedCount() > 0) {
        <div class="d-flex align-items-center gap-2 mb-3 flex-wrap">
          <span class="badge bg-dark bg-opacity-10 text-dark px-3 py-2">{{ selectedCount() }} selected</span>
          <button class="btn btn-sm btn-outline-primary" (click)="openBulkUpdate()">Bulk Update</button>
          <button class="btn btn-sm btn-outline-secondary" (click)="confirmAction.set('archive')">Bulk Archive</button>
          <button class="btn btn-sm btn-outline-secondary" (click)="confirmAction.set('restore')">Bulk Restore</button>
          <button class="btn btn-sm btn-outline-danger" (click)="confirmAction.set('delete')">Bulk Delete</button>
          <button class="btn btn-sm btn-link text-decoration-none text-muted" (click)="clearSelection()">Clear</button>
        </div>
      }
      @if (undoEntry(); as entry) {
        <div class="alert alert-info d-flex align-items-center justify-content-between py-2 mb-3 border-0 shadow-sm">
          <span class="small">{{ undoMessage() }}</span>
          <div class="d-flex gap-2">
            <button class="btn btn-sm btn-outline-info" (click)="undo()" [disabled]="undoing()">Undo</button>
            <button class="btn btn-sm btn-link text-decoration-none text-muted p-0" (click)="dismissUndo()">&times;</button>
          </div>
        </div>
      }
      <div class="card border-0 shadow-sm">
        <div class="table-responsive">
          <table class="table table-hover mb-0 align-middle" style="font-size:.875rem">
            <thead class="table-light">
              <tr>
                <th style="width:36px"><input type="checkbox" class="form-check-input" [checked]="isAllSelected()" [indeterminate]="isIndeterminate()" (change)="toggleSelectAll()" /></th>
                <th style="width:44px"></th>
                <th sortable (click)="setSort('name')" style="cursor:pointer;min-width:110px">Product Name {{ sortIndicator('name') }}</th>
                <th sortable (click)="setSort('brand')" style="cursor:pointer;width:90px">Brand {{ sortIndicator('brand') }}</th>
                <th sortable (click)="setSort('category')" style="cursor:pointer;width:90px">Category {{ sortIndicator('category') }}</th>
                <th sortable (click)="setSort('websiteStatus')" style="cursor:pointer;width:80px">Website {{ sortIndicator('websiteStatus') }}</th>
                <th sortable (click)="setSort('marketplaceStatus')" style="cursor:pointer;width:90px">Marketplace {{ sortIndicator('marketplaceStatus') }}</th>
                <th style="width:90px">Platforms</th>
                <th sortable (click)="setSort('aiStatus')" style="cursor:pointer;width:70px">AI {{ sortIndicator('aiStatus') }}</th>
                <th sortable (click)="setSort('listingStatus')" style="cursor:pointer;width:80px">Pub. Status {{ sortIndicator('listingStatus') }}</th>
                <th sortable (click)="setSort('mrp')" style="cursor:pointer;width:80px;text-align:right">MRP {{ sortIndicator('mrp') }}</th>
                <th sortable (click)="setSort('sellingPrice')" style="cursor:pointer;width:80px;text-align:right">Selling {{ sortIndicator('sellingPrice') }}</th>
                <th sortable (click)="setSort('stock')" style="cursor:pointer;width:60px;text-align:right">Stock {{ sortIndicator('stock') }}</th>
                <th sortable (click)="setSort('updatedAt')" style="cursor:pointer;width:90px">Updated {{ sortIndicator('updatedAt') }}</th>
                <th style="width:60px"></th>
              </tr>
            </thead>
            <tbody>
              @for (row of paginatedRows(); track row.product.id) {
                <tr [class.table-active]="row.product.id && selectedIds().has(row.product.id)">
                  <td><input type="checkbox" class="form-check-input" [checked]="row.product.id ? selectedIds().has(row.product.id) : false" (change)="row.product.id && toggleSelection(row.product.id)" /></td>
                  <td>
                    @if (row.imageUrl) {
                      <img [src]="row.imageUrl" alt="" class="rounded" style="width:36px;height:36px;object-fit:cover" referrerpolicy="no-referrer" />
                    }
                  </td>
                  <td class="fw-medium text-truncate" style="max-width:180px" [title]="row.product.name">{{ row.product.name }}</td>
                  <td class="text-truncate" style="max-width:80px" [title]="row.product.brand || ''">{{ row.product.brand || '-' }}</td>
                  <td class="text-truncate" style="max-width:80px" [title]="row.product.category || ''">{{ row.product.category || '-' }}</td>
                  <td><span class="badge" [class]="productStatusBadge(row.product.status)">{{ row.product.status }}</span></td>
                  <td><span class="badge" [class]="listingStatusBadge(row.marketplaceStatus)">{{ row.marketplaceStatus }}</span></td>
                  <td>
                    <div class="d-flex gap-1 flex-wrap">
                      @for (p of row.platforms; track p) {
                        <span class="badge bg-light text-dark border px-2 py-1" style="font-size:.7rem">{{ labels[p] }}</span>
                      }
                    </div>
                  </td>
                  <td><span class="badge" [class]="aiStatusBadge(row.aiStatus)">{{ row.aiStatus === 'not_applicable' ? 'N/A' : row.aiStatus }}</span></td>
                  <td><span class="badge" [class]="publishStatusBadge(row.publishStatus)">{{ row.publishStatus }}</span></td>
                  <td style="text-align:right;white-space:nowrap">{{ row.mrp | currency:'INR':'symbol':'1.0-0' }}</td>
                  <td style="text-align:right;white-space:nowrap">{{ row.sellingPrice | currency:'INR':'symbol':'1.0-0' }}</td>
                  <td style="text-align:right">{{ row.stock }}</td>
                  <td style="white-space:nowrap">{{ row.product.updatedAt | date:'mediumDate' }}</td>
                  <td>
                    <div class="dropdown" (click)="$event.stopPropagation()">
                      <button class="btn btn-sm btn-light border dropdown-toggle py-1 px-2" data-bs-toggle="dropdown" aria-expanded="false" (click)="openDropdownId.set(row.product.id!)">
                        <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><circle cx="7" cy="3" r="1"/><circle cx="7" cy="7" r="1"/><circle cx="7" cy="11" r="1"/></svg>
                      </button>
                      <ul class="dropdown-menu dropdown-menu-end shadow-sm" [class.show]="openDropdownId() === row.product.id" style="font-size:.85rem;min-width:180px">
                        <li><button class="dropdown-item" (click)="openWorkspace(row.product)">Open Workspace</button></li>
                        <li><button class="dropdown-item" (click)="generateAiContent(row.product)">Generate AI Content</button></li>
                        <li><hr class="dropdown-divider"></li>
                        <li><button class="dropdown-item" (click)="publishProduct(row.product)">Publish</button></li>
                        <li><button class="dropdown-item" (click)="syncProduct(row.product)">Sync</button></li>
                        <li><button class="dropdown-item" (click)="viewHistory(row.product)">View History</button></li>
                        <li><hr class="dropdown-divider"></li>
                        <li><button class="dropdown-item" (click)="duplicateProduct(row.product)">Duplicate</button></li>
                        <li><button class="dropdown-item text-warning" (click)="archiveProduct(row.product)">Archive</button></li>
                        <li><button class="dropdown-item text-danger" (click)="deleteProduct(row.product)">Delete</button></li>
                      </ul>
                    </div>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="15" class="text-center py-4 text-muted">
                    @if (loading()) { Loading products... }
                    @else { No marketplace products found. }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        @if (totalFiltered() > 0) {
          <div class="d-flex justify-content-between align-items-center px-3 py-2 border-top bg-light bg-opacity-50" style="font-size:.85rem">
            <div class="text-muted">
              Showing {{ startIndex() + 1 }}–{{ endIndex() }} of {{ totalFiltered() }}
            </div>
            <div class="d-flex align-items-center gap-2">
              <span class="text-muted small">Rows:</span>
              <select class="form-select form-select-sm" style="width:auto" [ngModel]="pageSize()" (ngModelChange)="pageSize.set(+$event);currentPage.set(1)">
                <option [value]="10">10</option>
                <option [value]="25">25</option>
                <option [value]="50">50</option>
                <option [value]="100">100</option>
              </select>
              <button class="btn btn-sm btn-outline-secondary py-0 px-2" [disabled]="currentPage() <= 1" (click)="currentPage.set(currentPage() - 1)">Prev</button>
              @for (p of visiblePages(); track p) {
                <button class="btn btn-sm py-0 px-2" [class.btn-primary]="p === currentPage()" [class.btn-outline-secondary]="p !== currentPage()" (click)="currentPage.set(p)">{{ p }}</button>
              }
              <button class="btn btn-sm btn-outline-secondary py-0 px-2" [disabled]="currentPage() >= totalPages()" (click)="currentPage.set(currentPage() + 1)">Next</button>
            </div>
          </div>
        }
      </div>
    </app-marketplace-layout>

    @if (showModal() && editingProduct(); as product) {
      <div class="modal-overlay" role="dialog" aria-modal="true" aria-label="Edit product" (click)="closeModal()">
        <div class="modal-dialog modal-xl modal-dialog-scrollable" role="document" (click)="$event.stopPropagation()">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title fw-bold">{{ product.name }}</h5>
              <button type="button" class="btn-close" (click)="closeModal()"></button>
            </div>
            <div class="modal-body p-0">
              <ul class="nav nav-tabs px-3 pt-3 bg-light">
                <li class="nav-item"><button class="nav-link" [class.active]="activeTab() === 'details'" (click)="activeTab.set('details')">Details</button></li>
                @for (p of platforms; track p) {
                  <li class="nav-item"><button class="nav-link" [class.active]="activeTab() === p" (click)="activeTab.set(p)">{{ labels[p] }}</button></li>
                }
              </ul>
              <div class="p-3">
                @if (activeTab() === 'details') {
                  <div class="row g-3">
                    <div class="col-md-6"><label class="form-label small fw-medium">Name</label><input class="form-control" [(ngModel)]="product.name" /></div>
                    <div class="col-md-6"><label class="form-label small fw-medium">Brand</label><input class="form-control" [(ngModel)]="product.brand" /></div>
                    <div class="col-12"><label class="form-label small fw-medium">Description</label><textarea class="form-control" rows="3" [(ngModel)]="product.description"></textarea></div>
                    <div class="col-12">
                      <label class="form-label small fw-medium">Highlights</label>
                      @for (h of product.highlights; track idx; let idx = $index) {
                        <div class="input-group mb-2"><input class="form-control" [(ngModel)]="product.highlights[idx]" /><button class="btn btn-outline-danger" (click)="removeHighlight(idx)">&times;</button></div>
                      }
                      <button class="btn btn-sm btn-outline-primary" (click)="addHighlight()">+ Add Highlight</button>
                    </div>
                    <div class="col-12">
                      <label class="form-label small fw-medium">Specifications</label>
                      @for (s of product.specifications; track idx; let idx = $index) {
                        <div class="row g-2 mb-2"><div class="col-5"><input class="form-control form-control-sm" placeholder="Label" [(ngModel)]="product.specifications[idx].label" /></div><div class="col-5"><input class="form-control form-control-sm" placeholder="Value" [(ngModel)]="product.specifications[idx].value" /></div><div class="col-2"><button class="btn btn-sm btn-outline-danger" (click)="removeSpecification(idx)">&times;</button></div></div>
                      }
                      <button class="btn btn-sm btn-outline-primary" (click)="addSpecification()">+ Add Specification</button>
                    </div>
                    <div class="col-md-4"><label class="form-label small fw-medium">Package Contents</label><input class="form-control" [(ngModel)]="product.packageContents" /></div>
                    <div class="col-md-3"><label class="form-label small fw-medium">HSN Code</label><input class="form-control" [(ngModel)]="product.hsn" /></div>
                    <div class="col-md-2"><label class="form-label small fw-medium">GST (%)</label><input type="number" class="form-control" [(ngModel)]="product.gst" /></div>
                    <div class="col-md-3"><label class="form-label small fw-medium">Country of Origin</label><input class="form-control" [(ngModel)]="product.countryOfOrigin" /></div>
                  </div>
                }
                @for (p of platforms; track p) {
                  @if (activeTab() === p) {
                    @let listing = getListing(p);
                    @if (listing) {
                      <div class="row g-3">
                        <div class="col-md-6"><label class="form-label small fw-medium">Marketplace Title</label><input class="form-control" [(ngModel)]="listing.marketplaceTitle" /></div>
                        <div class="col-md-6"><label class="form-label small fw-medium">Marketplace SKU</label><input class="form-control" [(ngModel)]="listing.marketplaceSku" /></div>
                        <div class="col-md-6"><label class="form-label small fw-medium">Seller SKU</label><input class="form-control" [(ngModel)]="listing.sellerSku" /></div>
                        <div class="col-md-6"><label class="form-label small fw-medium">FSN</label><input class="form-control" [(ngModel)]="listing.fsn" /></div>
                        <div class="col-12"><label class="form-label small fw-medium">Marketplace Description</label><textarea class="form-control" rows="3" [(ngModel)]="listing.marketplaceDescription"></textarea></div>
                        <div class="col-md-8"><label class="form-label small fw-medium">Listing URL</label><input class="form-control" [(ngModel)]="listing.listingUrl" /></div>
                        <div class="col-md-4">
                          <label class="form-label small fw-medium">Status</label>
                          <select class="form-select" [(ngModel)]="listing.listingStatus">
                            <option value="active">Active</option><option value="inactive">Inactive</option><option value="draft">Draft</option><option value="pending">Pending</option><option value="rejected">Rejected</option><option value="blocked">Blocked</option>
                          </select>
                        </div>
                        <div class="col-md-3"><label class="form-label small fw-medium">MRP (₹)</label><input type="number" class="form-control" [(ngModel)]="listing.pricing.mrp" /></div>
                        <div class="col-md-3"><label class="form-label small fw-medium">Selling Price (₹)</label><input type="number" class="form-control" [(ngModel)]="listing.pricing.sellingPrice" /></div>
                        <div class="col-md-3"><label class="form-label small fw-medium">Total Stock</label><input type="number" class="form-control" [(ngModel)]="listing.inventory.totalStock" /></div>
                        <div class="col-md-3"><label class="form-label small fw-medium">Available Stock</label><input type="number" class="form-control" [(ngModel)]="listing.inventory.availableStock" /></div>
                        <div class="col-md-4">
                          <label class="form-label small fw-medium">Publish Status</label>
                          <select class="form-select" [(ngModel)]="listing.publishStatus">
                            <option value="draft">Draft</option><option value="pending_review">Pending Review</option><option value="published">Published</option><option value="unpublished">Unpublished</option><option value="suspended">Suspended</option>
                          </select>
                        </div>
                        <div class="col-md-4"><label class="form-label small fw-medium">Return Policy</label><input class="form-control" [(ngModel)]="listing.returnPolicy" /></div>
                        <div class="col-md-4"><label class="form-label small fw-medium">Handling Time (days)</label><input type="number" class="form-control" [(ngModel)]="listing.handlingTimeDays" /></div>
                      </div>
                    } @else {
                      <div class="text-center py-5">
                        <p class="text-muted mb-3">Not yet listed on {{ labels[p] }}.</p>
                        <button class="btn btn-outline-primary" (click)="createListing(p)">Add to {{ labels[p] }}</button>
                      </div>
                    }
                  }
                }
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn btn-light" (click)="closeModal()">Cancel</button>
              <button class="btn btn-primary" (click)="saveAll()" [disabled]="saving()">@if (saving()) { Saving... } @else { Save Changes }</button>
            </div>
          </div>
        </div>
      </div>
    }

    @if (showBulkUpdate()) {
      <div class="modal-overlay" role="dialog" aria-modal="true" aria-label="Bulk update products" (click)="showBulkUpdate.set(false)">
        <div class="modal-dialog modal-lg modal-dialog-scrollable" role="document" (click)="$event.stopPropagation()">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title fw-bold">Bulk Update ({{ selectedCount() }} products)</h5>
              <button type="button" class="btn-close" (click)="showBulkUpdate.set(false)"></button>
            </div>
            <div class="modal-body">
              <div class="row g-3">
                <div class="col-md-6">
                  <div class="form-check mb-1"><input class="form-check-input" type="checkbox" id="bf-price" [(ngModel)]="bulkForm.price.apply" /><label class="form-check-label small fw-medium" for="bf-price">Selling Price (₹)</label></div>
                  <input type="number" class="form-control" [class.bg-light]="!bulkForm.price.apply" [(ngModel)]="bulkForm.price.value" />
                </div>
                <div class="col-md-6">
                  <div class="form-check mb-1"><input class="form-check-input" type="checkbox" id="bf-stock" [(ngModel)]="bulkForm.stock.apply" /><label class="form-check-label small fw-medium" for="bf-stock">Stock</label></div>
                  <input type="number" class="form-control" [class.bg-light]="!bulkForm.stock.apply" [(ngModel)]="bulkForm.stock.value" />
                </div>
                <div class="col-md-4">
                  <div class="form-check mb-1"><input class="form-check-input" type="checkbox" id="bf-hsn" [(ngModel)]="bulkForm.hsn.apply" /><label class="form-check-label small fw-medium" for="bf-hsn">HSN Code</label></div>
                  <input class="form-control" [class.bg-light]="!bulkForm.hsn.apply" [(ngModel)]="bulkForm.hsn.value" />
                </div>
                <div class="col-md-4">
                  <div class="form-check mb-1"><input class="form-check-input" type="checkbox" id="bf-gst" [(ngModel)]="bulkForm.gst.apply" /><label class="form-check-label small fw-medium" for="bf-gst">GST (%)</label></div>
                  <input type="number" class="form-control" [class.bg-light]="!bulkForm.gst.apply" [(ngModel)]="bulkForm.gst.value" />
                </div>
                <div class="col-md-4">
                  <div class="form-check mb-1"><input class="form-check-input" type="checkbox" id="bf-country" [(ngModel)]="bulkForm.country.apply" /><label class="form-check-label small fw-medium" for="bf-country">Country</label></div>
                  <input class="form-control" [class.bg-light]="!bulkForm.country.apply" [(ngModel)]="bulkForm.country.value" />
                </div>
                <div class="col-md-6">
                  <div class="form-check mb-1"><input class="form-check-input" type="checkbox" id="bf-pkg" [(ngModel)]="bulkForm.packageContents.apply" /><label class="form-check-label small fw-medium" for="bf-pkg">Package Contents</label></div>
                  <input class="form-control" [class.bg-light]="!bulkForm.packageContents.apply" [(ngModel)]="bulkForm.packageContents.value" />
                </div>
                <div class="col-md-6">
                  <div class="form-check mb-1"><input class="form-check-input" type="checkbox" id="bf-seo" [(ngModel)]="bulkForm.seoKeywords.apply" /><label class="form-check-label small fw-medium" for="bf-seo">SEO Keywords</label></div>
                  <input class="form-control" [class.bg-light]="!bulkForm.seoKeywords.apply" [(ngModel)]="bulkForm.seoKeywords.value" />
                </div>
                <div class="col-12">
                  <div class="form-check mb-1"><input class="form-check-input" type="checkbox" id="bf-desc" [(ngModel)]="bulkForm.description.apply" /><label class="form-check-label small fw-medium" for="bf-desc">Description</label></div>
                  <textarea class="form-control" rows="2" [class.bg-light]="!bulkForm.description.apply" [(ngModel)]="bulkForm.description.value"></textarea>
                </div>
                <div class="col-md-6">
                  <div class="form-check mb-1"><input class="form-check-input" type="checkbox" id="bf-status" [(ngModel)]="bulkForm.marketplaceStatus.apply" /><label class="form-check-label small fw-medium" for="bf-status">Marketplace Status</label></div>
                  <select class="form-select" [class.bg-light]="!bulkForm.marketplaceStatus.apply" [(ngModel)]="bulkForm.marketplaceStatus.value">
                    <option value="active">Active</option><option value="inactive">Inactive</option><option value="draft">Draft</option><option value="pending">Pending</option><option value="rejected">Rejected</option><option value="blocked">Blocked</option>
                  </select>
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn btn-light" (click)="showBulkUpdate.set(false)">Cancel</button>
              <button class="btn btn-primary" (click)="applyBulkUpdate()" [disabled]="bulkUpdating()">@if (bulkUpdating()) { Applying... } @else { Apply }</button>
            </div>
          </div>
        </div>
      </div>
    }

    @if (confirmAction(); as action) {
      <div class="modal-overlay" role="dialog" aria-modal="true" [attr.aria-label]="'Confirm '+action" (click)="confirmAction.set(null)">
        <div class="modal-dialog modal-sm modal-dialog-centered" role="document" (click)="$event.stopPropagation()">
          <div class="modal-content">
            <div class="modal-body text-center py-4">
              @if (action === 'delete') {
                <div class="mb-3 text-danger"><svg width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="20" cy="20" r="18"/><path d="m14 14 12 12m0-12-12 12"/></svg></div>
                <h6 class="fw-bold">Delete {{ selectedCount() }} products?</h6>
                <p class="small text-muted mb-0">This will permanently delete the products and all their listings.</p>
              } @else if (action === 'archive') {
                <h6 class="fw-bold">Archive {{ selectedCount() }} products?</h6>
                <p class="small text-muted mb-0">Archived products can be restored later.</p>
              } @else if (action === 'restore') {
                <h6 class="fw-bold">Restore {{ selectedCount() }} products?</h6>
                <p class="small text-muted mb-0">Restored products will become active again.</p>
              }
            </div>
            <div class="modal-footer justify-content-center border-0 pt-0">
              <button class="btn btn-light" (click)="confirmAction.set(null)">Cancel</button>
              <button class="btn" [class.btn-danger]="action === 'delete'" [class.btn-secondary]="action !== 'delete'" (click)="executeConfirm(action)" [disabled]="bulkUpdating()">
                @if (bulkUpdating()) { Processing... } @else { Confirm }
              </button>
            </div>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:1050;display:flex;align-items:flex-start;justify-content:center;padding:2rem 1rem;overflow-y:auto}
    .modal-dialog{width:100%;max-width:900px;margin:auto}
    .modal-dialog.modal-sm{max-width:420px}
    .table th{font-size:.75rem;font-weight:600;text-transform:uppercase;letter-spacing:.03em;color:#666;white-space:nowrap;user-select:none}
    .table th[sortable]:hover{color:#1a1a2e;background:rgba(0,0,0,.02)}
    .table td{font-size:.875rem}
    .nav-tabs .nav-link{font-size:.85rem;padding:.5rem 1rem;color:#666}
    .nav-tabs .nav-link.active{font-weight:600;color:#1a1a2e}
    .form-label{color:#555;margin-bottom:.2rem}
    .dropdown-item{font-size:.85rem;padding:.35rem 1rem}
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MarketplaceProductsComponent implements OnInit {
  private readonly productSvc = inject(MarketplaceProductService);
  private readonly listingSvc = inject(MarketplaceListingService);
  private readonly syncEngine = inject(SyncEngineService);
  private readonly router = inject(Router);

  readonly platforms: MarketplacePlatformType[] = ['flipkart', 'meesho', 'amazon'];
  readonly labels = MARKETPLACE_LABELS;

  // --- Data ---
  products = signal<MarketplaceProduct[]>([]);
  loading = signal(false);
  private _allListings: MarketplaceListing[] = [];

  // --- Search & Filters ---
  searchTerm = signal('');
  statusFilter = signal('');
  categoryFilter = signal('');
  brandFilter = signal('');
  platformFilter = signal('');
  aiStatusFilter = signal('');
  publishStatusFilter = signal('');

  hasActiveFilters = computed(() =>
    !!this.searchTerm() || !!this.statusFilter() || !!this.categoryFilter() ||
    !!this.brandFilter() || !!this.platformFilter() || !!this.aiStatusFilter() ||
    !!this.publishStatusFilter()
  );

  uniqueCategories = computed(() => {
    const set = new Set<string>();
    for (const p of this.products()) { if (p.category) set.add(p.category); }
    return [...set].sort();
  });

  uniqueBrands = computed(() => {
    const set = new Set<string>();
    for (const p of this.products()) { if (p.brand) set.add(p.brand); }
    return [...set].sort();
  });

  // --- Sort ---
  sortField = signal<SortField>('updatedAt');
  sortDir = signal<SortDir>('desc');
  openDropdownId = signal('');

  setSort(field: SortField): void {
    if (this.sortField() === field) {
      this.sortDir.update(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortField.set(field);
      this.sortDir.set('asc');
    }
    this.currentPage.set(1);
  }

  sortIndicator(field: SortField): string {
    if (this.sortField() !== field) return '';
    return this.sortDir() === 'asc' ? '\u25B2' : '\u25BC';
  }

  // --- Selection ---
  selectedIds = signal<Set<string>>(new Set());

  isAllSelected = computed(() => {
    const rows = this.paginatedRows();
    return rows.length > 0 && rows.every(r => r.product.id && this.selectedIds().has(r.product.id));
  });

  isIndeterminate = computed(() => {
    const rows = this.paginatedRows();
    if (!rows.length) return false;
    const count = rows.filter(r => r.product.id && this.selectedIds().has(r.product.id)).length;
    return count > 0 && count < rows.length;
  });

  selectedCount = computed(() => this.selectedIds().size);

  toggleSelection(id: string): void {
    this.selectedIds.update(ids => {
      const next = new Set(ids);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  toggleSelectAll(): void {
    if (this.isAllSelected()) {
      this.clearSelection();
    } else {
      const ids = this.paginatedRows().filter(r => r.product.id).map(r => r.product.id!);
      this.selectedIds.set(new Set(ids));
    }
  }

  clearSelection(): void {
    this.selectedIds.set(new Set());
  }

  // --- Filtered / Sorted / Paginated rows ---

  private listingsByProduct = computed(() => {
    const map = new Map<string, MarketplaceListing[]>();
    for (const l of this._allListings) {
      const pid = l.marketplaceProductId;
      if (!map.has(pid)) map.set(pid, []);
      map.get(pid)!.push(l);
    }
    return map;
  });

  private buildRowData = (p: MarketplaceProduct): ProductRowData => {
    const listings = this.listingsByProduct().get(p.id!) ?? [];
    const imageUrl = p.images.find(i => i.isPrimary)?.url ?? p.images[0]?.url ?? '';
    const platforms = [...new Set(listings.map(l => l.platform))];
    const aiStatus = listings.map(l => l.aiStatus).sort((a, b) => (AI_STATUS_ORDER[b] ?? 0) - (AI_STATUS_ORDER[a] ?? 0))[0] ?? 'not_applicable';
    const marketplaceStatus = listings.map(l => l.listingStatus).sort((a, b) => (LISTING_STATUS_ORDER[b] ?? 0) - (LISTING_STATUS_ORDER[a] ?? 0))[0] ?? 'draft';
    const publishStatus = listings.map(l => l.publishStatus).sort((a, b) => (PUBLISH_STATUS_ORDER[b] ?? 0) - (PUBLISH_STATUS_ORDER[a] ?? 0))[0] ?? 'draft';
    const mrp = Math.max(...listings.map(l => l.pricing.mrp), 0);
    const sellingPrice = Math.max(...listings.map(l => l.pricing.sellingPrice), 0);
    const stock = listings.reduce((s, l) => s + (l.inventory.totalStock ?? 0), 0);
    return { product: p, listings, imageUrl, platforms, aiStatus, listingStatus: marketplaceStatus, publishStatus, marketplaceStatus, mrp, sellingPrice, stock };
  };

  filteredRows = computed(() => {
    const term = this.searchTerm().toLowerCase();
    const st = this.statusFilter();
    const cat = this.categoryFilter();
    const br = this.brandFilter();
    const pl = this.platformFilter();
    const ai = this.aiStatusFilter();
    const ps = this.publishStatusFilter();

    return this.products()
      .filter(p => {
        if (term && !p.name.toLowerCase().includes(term) && !(p.brand?.toLowerCase().includes(term)) && !(p.category?.toLowerCase().includes(term))) return false;
        if (st && p.status !== st) return false;
        if (cat && p.category !== cat) return false;
        if (br && p.brand !== br) return false;
        if (pl) {
          const listings = this.listingsByProduct().get(p.id!) ?? [];
          if (!listings.some(l => l.platform === pl)) return false;
        }
        if (ai || ps) {
          const listings = this.listingsByProduct().get(p.id!) ?? [];
          if (ai && !listings.some(l => l.aiStatus === ai)) return false;
          if (ps && !listings.some(l => l.publishStatus === ps)) return false;
        }
        return true;
      })
      .map(p => this.buildRowData(p));
  });

  sortedRows = computed(() => {
    const rows = [...this.filteredRows()];
    const field = this.sortField();
    const dir = this.sortDir();
    rows.sort((a, b) => {
      let cmp = 0;
      switch (field) {
        case 'name': cmp = a.product.name.localeCompare(b.product.name); break;
        case 'brand': cmp = (a.product.brand ?? '').localeCompare(b.product.brand ?? ''); break;
        case 'category': cmp = (a.product.category ?? '').localeCompare(b.product.category ?? ''); break;
        case 'websiteStatus': cmp = a.product.status.localeCompare(b.product.status); break;
        case 'platforms': cmp = a.platforms.length - b.platforms.length; break;
        case 'aiStatus': cmp = (AI_STATUS_ORDER[a.aiStatus] ?? 0) - (AI_STATUS_ORDER[b.aiStatus] ?? 0); break;
        case 'marketplaceStatus': cmp = (LISTING_STATUS_ORDER[a.marketplaceStatus] ?? 0) - (LISTING_STATUS_ORDER[b.marketplaceStatus] ?? 0); break;
        case 'listingStatus': cmp = (PUBLISH_STATUS_ORDER[a.publishStatus] ?? 0) - (PUBLISH_STATUS_ORDER[b.publishStatus] ?? 0); break;
        case 'mrp': cmp = a.mrp - b.mrp; break;
        case 'sellingPrice': cmp = a.sellingPrice - b.sellingPrice; break;
        case 'stock': cmp = a.stock - b.stock; break;
        case 'updatedAt': cmp = a.product.updatedAt.getTime() - b.product.updatedAt.getTime(); break;
      }
      return dir === 'asc' ? cmp : -cmp;
    });
    return rows;
  });

  // --- Pagination ---
  pageSize = signal(25);
  currentPage = signal(1);

  totalFiltered = computed(() => this.sortedRows().length);
  totalPages = computed(() => Math.max(1, Math.ceil(this.totalFiltered() / this.pageSize())));

  paginatedRows = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.sortedRows().slice(start, start + this.pageSize());
  });

  startIndex = computed(() => (this.currentPage() - 1) * this.pageSize());
  endIndex = computed(() => Math.min(this.startIndex() + this.pageSize(), this.totalFiltered()));

  visiblePages = computed(() => {
    const total = this.totalPages();
    const cur = this.currentPage();
    const pages: number[] = [];
    const start = Math.max(1, cur - 2);
    const end = Math.min(total, cur + 2);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  });

  // --- Edit modal state ---
  showModal = signal(false);
  saving = signal(false);
  activeTab = signal<'details' | MarketplacePlatformType>('details');
  private _editingProduct: MarketplaceProduct | null = null;
  private _listingsMap = new Map<MarketplacePlatformType, MarketplaceListing>();
  editingProduct = computed(() => this._editingProduct);

  // --- Bulk update state ---
  showBulkUpdate = signal(false);
  bulkUpdating = signal(false);
  bulkForm: BulkUpdateForm = {
    price: { apply: false, value: 0 },
    stock: { apply: false, value: 0 },
    hsn: { apply: false, value: '' },
    gst: { apply: false, value: 0 },
    country: { apply: false, value: '' },
    packageContents: { apply: false, value: '' },
    description: { apply: false, value: '' },
    seoKeywords: { apply: false, value: '' },
    marketplaceStatus: { apply: false, value: 'active' },
  };

  // --- Confirm state ---
  confirmAction = signal<ConfirmAction>(null);

  // --- Undo state ---
  undoEntry = signal<UndoEntry | null>(null);
  undoMessage = signal('');
  undoing = signal(false);

  ngOnInit(): void {
    this.loadProducts();
  }

  clearFilters(): void {
    this.searchTerm.set('');
    this.statusFilter.set('');
    this.categoryFilter.set('');
    this.brandFilter.set('');
    this.platformFilter.set('');
    this.aiStatusFilter.set('');
    this.publishStatusFilter.set('');
    this.currentPage.set(1);
  }

  private async loadProducts(): Promise<void> {
    this.loading.set(true);
    try {
      const result = await this.productSvc.getAll({ pageSize: 500 });
      this.products.set(result.items);
      const listingResult = await this.listingSvc.getAll({ pageSize: 1000 });
      this._allListings = listingResult.items;
    } finally {
      this.loading.set(false);
    }
  }

  // --- Edit modal ---

  async openEdit(product: MarketplaceProduct): Promise<void> {
    this._editingProduct = JSON.parse(JSON.stringify(product));
    this._listingsMap.clear();
    this.activeTab.set('details');
    this.showModal.set(true);
    const listings = await this.listingSvc.getByProductId(product.id!);
    for (const l of listings) {
      this._listingsMap.set(l.platform, JSON.parse(JSON.stringify(l)));
    }
  }

  getListing(platform: MarketplacePlatformType): MarketplaceListing | null {
    return this._listingsMap.get(platform) ?? null;
  }

  createListing(platform: MarketplacePlatformType): void {
    const product = this._editingProduct;
    if (!product) return;
    this._listingsMap.set(platform, {
      marketplaceProductId: product.id!,
      websiteProductId: product.websiteProductId,
      platform,
      marketplaceTitle: product.name,
      marketplaceDescription: product.description,
      listingStatus: 'draft',
      marketplaceSku: '',
      sellerSku: '',
      listingUrl: '',
      fsn: '',
      marketplaceListingId: '',
      pricing: { mrp: 0, sellingPrice: 0, discountPercent: 0, taxRate: 0, taxInclusive: true, shippingCharge: 0, currency: 'INR', createdAt: new Date(), updatedAt: new Date() },
      inventory: { totalStock: 0, availableStock: 0, reservedStock: 0, damagedStock: 0, incomingStock: 0, lowStockThreshold: 5, stockStatus: 'out_of_stock', fulfillmentType: 'self', createdAt: new Date(), updatedAt: new Date() },
      aiStatus: 'not_applicable',
      publishStatus: 'draft',
      fulfillmentType: 'self',
      handlingTimeDays: 2,
      returnPolicy: '',
      shippingWeight: 0,
      shippingWeightUnit: 'g',
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  async saveAll(): Promise<void> {
    const product = this._editingProduct;
    if (!product || !product.id) return;
    this.saving.set(true);
    try {
      await this.productSvc.update(product.id, product as any);
      for (const [, listing] of this._listingsMap) {
        if (listing.id) {
          await this.listingSvc.update(listing.id, listing as any);
        } else {
          const { id, createdAt, updatedAt, version, ...data } = listing as any;
          await this.listingSvc.create(data);
        }
      }
      await this.loadProducts();
      this.closeModal();
    } finally {
      this.saving.set(false);
    }
  }

  closeModal(): void {
    this.showModal.set(false);
    this._editingProduct = null;
    this._listingsMap.clear();
  }

  addHighlight(): void {
    if (!this._editingProduct) return;
    this._editingProduct.highlights = [...this._editingProduct.highlights, ''];
  }

  removeHighlight(index: number): void {
    if (!this._editingProduct) return;
    this._editingProduct.highlights = this._editingProduct.highlights.filter((_, i) => i !== index);
  }

  addSpecification(): void {
    if (!this._editingProduct) return;
    this._editingProduct.specifications = [...this._editingProduct.specifications, { label: '', value: '' }];
  }

  removeSpecification(index: number): void {
    if (!this._editingProduct) return;
    this._editingProduct.specifications = this._editingProduct.specifications.filter((_, i) => i !== index);
  }

  // --- Badge helpers ---

  productStatusBadge(status: string): string {
    const map: Record<string, string> = {
      active: 'bg-success bg-opacity-10 text-success',
      inactive: 'bg-secondary bg-opacity-10 text-secondary',
      draft: 'bg-warning bg-opacity-10 text-warning',
      archived: 'bg-dark bg-opacity-10 text-dark',
    };
    return map[status] || 'bg-secondary bg-opacity-10 text-secondary';
  }

  listingStatusBadge(status: string): string {
    const map: Record<string, string> = {
      active: 'bg-success bg-opacity-10 text-success',
      inactive: 'bg-secondary bg-opacity-10 text-secondary',
      draft: 'bg-warning bg-opacity-10 text-warning',
      pending: 'bg-info bg-opacity-10 text-info',
      rejected: 'bg-danger bg-opacity-10 text-danger',
      blocked: 'bg-dark bg-opacity-10 text-dark',
    };
    return map[status] || 'bg-secondary bg-opacity-10 text-secondary';
  }

  aiStatusBadge(status: string): string {
    const map: Record<string, string> = {
      completed: 'bg-success bg-opacity-10 text-success',
      pending: 'bg-info bg-opacity-10 text-info',
      processing: 'bg-warning bg-opacity-10 text-warning',
      failed: 'bg-danger bg-opacity-10 text-danger',
      not_applicable: 'bg-secondary bg-opacity-10 text-secondary',
    };
    return map[status] || 'bg-secondary bg-opacity-10 text-secondary';
  }

  publishStatusBadge(status: string): string {
    const map: Record<string, string> = {
      published: 'bg-success bg-opacity-10 text-success',
      pending_review: 'bg-warning bg-opacity-10 text-warning',
      draft: 'bg-secondary bg-opacity-10 text-secondary',
      unpublished: 'bg-dark bg-opacity-10 text-dark',
      suspended: 'bg-danger bg-opacity-10 text-danger',
    };
    return map[status] || 'bg-secondary bg-opacity-10 text-secondary';
  }

  // --- Bulk Update ---

  openBulkUpdate(): void {
    this.bulkForm = {
      price: { apply: false, value: 0 },
      stock: { apply: false, value: 0 },
      hsn: { apply: false, value: '' },
      gst: { apply: false, value: 0 },
      country: { apply: false, value: '' },
      packageContents: { apply: false, value: '' },
      description: { apply: false, value: '' },
      seoKeywords: { apply: false, value: '' },
      marketplaceStatus: { apply: false, value: 'active' },
    };
    this.showBulkUpdate.set(true);
  }

  async applyBulkUpdate(): Promise<void> {
    const ids = [...this.selectedIds()];
    if (!ids.length) return;
    this.bulkUpdating.set(true);
    try {
      const products = this.products().filter(p => p.id && ids.includes(p.id));
      const listings = this._allListings.filter(l => l.marketplaceProductId && ids.includes(l.marketplaceProductId));

      const snapshotProducts = products.map(p => ({ id: p.id!, data: JSON.parse(JSON.stringify(p)) }));
      const snapshotListings = listings.map(l => ({ id: l.id!, data: JSON.parse(JSON.stringify(l)) }));

      const f = this.bulkForm;

      for (const product of products) {
        const update: Record<string, unknown> = {};
        if (f.hsn.apply) update['hsn'] = f.hsn.value;
        if (f.gst.apply) update['gst'] = f.gst.value;
        if (f.country.apply) update['countryOfOrigin'] = f.country.value;
        if (f.packageContents.apply) update['packageContents'] = f.packageContents.value;
        if (f.description.apply) update['description'] = f.description.value;
        if (f.seoKeywords.apply && product.seo) {
          update['seo'] = { ...product.seo, focusKeyword: f.seoKeywords.value };
        }
        if (Object.keys(update).length) {
          await this.productSvc.update(product.id!, update as any);
        }
      }

      for (const listing of listings) {
        const update: Record<string, unknown> = {};
        if (f.price.apply && listing.pricing) {
          update['pricing'] = { ...listing.pricing, sellingPrice: f.price.value };
        }
        if (f.stock.apply && listing.inventory) {
          update['inventory'] = { ...listing.inventory, totalStock: f.stock.value, availableStock: f.stock.value };
        }
        if (f.marketplaceStatus.apply) update['listingStatus'] = f.marketplaceStatus.value;
        if (Object.keys(update).length) {
          await this.listingSvc.update(listing.id!, update as any);
        }
      }

      this.undoEntry.set({
        type: 'update',
        productIds: ids,
        products: snapshotProducts,
        listings: snapshotListings,
      });
      this.undoMessage.set(`Bulk update applied to ${ids.length} products.`);
      this.showBulkUpdate.set(false);
      this.clearSelection();
      await this.loadProducts();
    } finally {
      this.bulkUpdating.set(false);
    }
  }

  // --- Bulk Archive / Restore / Delete ---

  async executeConfirm(action: NonNullable<ConfirmAction>): Promise<void> {
    const ids = [...this.selectedIds()];
    if (!ids.length) return;
    this.bulkUpdating.set(true);
    this.confirmAction.set(null);

    try {
      if (action === 'archive') {
        const products = this.products().filter(p => p.id && ids.includes(p.id));
        const snapshot = products.map(p => ({ id: p.id!, data: JSON.parse(JSON.stringify(p)) }));
        await this.productSvc.bulkArchive(ids);
        this.undoEntry.set({ type: 'archive', productIds: ids, products: snapshot, listings: [] });
        this.undoMessage.set(`Archived ${ids.length} products.`);
      } else if (action === 'restore') {
        const products = this.products().filter(p => p.id && ids.includes(p.id));
        const snapshot = products.map(p => ({ id: p.id!, data: JSON.parse(JSON.stringify(p)) }));
        await this.productSvc.bulkRestore(ids);
        this.undoEntry.set({ type: 'restore', productIds: ids, products: snapshot, listings: [] });
        this.undoMessage.set(`Restored ${ids.length} products.`);
      } else if (action === 'delete') {
        const products = this.products().filter(p => p.id && ids.includes(p.id));
        const listings = this._allListings.filter(l => l.marketplaceProductId && ids.includes(l.marketplaceProductId));
        const snapshotProducts = products.map(p => ({ id: p.id!, data: JSON.parse(JSON.stringify(p)) }));
        const snapshotListings = listings.map(l => ({ id: l.id!, data: JSON.parse(JSON.stringify(l)) }));
        for (const listing of listings) {
          if (listing.id) await this.listingSvc.delete(listing.id);
        }
        await this.productSvc.bulkDelete(ids);
        this.undoEntry.set({ type: 'delete', productIds: ids, products: snapshotProducts, listings: snapshotListings });
        this.undoMessage.set(`Deleted ${ids.length} products.`);
      }

      this.clearSelection();
      await this.loadProducts();
    } finally {
      this.bulkUpdating.set(false);
    }
  }

  // --- Undo ---

  dismissUndo(): void {
    this.undoEntry.set(null);
  }

  async undo(): Promise<void> {
    const entry = this.undoEntry();
    if (!entry) return;
    this.undoing.set(true);
    try {
      if (entry.type === 'update') {
        for (const p of entry.products) { if (p.id) await this.productSvc.update(p.id, p.data as any); }
        for (const l of entry.listings) { if (l.id) await this.listingSvc.update(l.id, l.data as any); }
      } else if (entry.type === 'archive') {
        await this.productSvc.bulkRestore(entry.productIds);
      } else if (entry.type === 'restore') {
        await this.productSvc.bulkArchive(entry.productIds);
      } else if (entry.type === 'delete') {
        for (const l of entry.listings) {
          if (l.id) { const { id: _id, createdAt, updatedAt, version, ...rest } = l.data; await this.listingSvc.create(rest as any); }
        }
        for (const p of entry.products) {
          if (p.id) { const { id: _id, createdAt, updatedAt, version, ...rest } = p.data; await this.productSvc.create(rest as any); }
        }
      }
      this.undoEntry.set(null);
      await this.loadProducts();
    } finally {
      this.undoing.set(false);
    }
  }

  // --- Row Actions ---

  openWorkspace(product: MarketplaceProduct): void {
    this.router.navigate(['/admin', 'marketplace', 'workspace', product.id]);
  }

  async generateAiContent(product: MarketplaceProduct): Promise<void> {
    this.router.navigate(['/admin', 'marketplace', 'products', product.id, 'ai']);
  }

  async publishProduct(product: MarketplaceProduct): Promise<void> {
    const listings = this._allListings.filter(l => l.marketplaceProductId === product.id);
    const pending = listings.filter(l => l.publishStatus !== 'published');
    if (!pending.length) return;
    this.loading.set(true);
    try {
      await this.listingSvc.bulkPublish(pending.map(l => l.id!));
      this.undoMessage.set(`Published "${product.name}" to ${pending.length} platform(s).`);
      await this.loadProducts();
    } finally {
      this.loading.set(false);
    }
  }

  async syncProduct(product: MarketplaceProduct): Promise<void> {
    if (!product.id) return;
    this.loading.set(true);
    try {
      await this.syncEngine.syncOne(product.id);
      this.undoMessage.set(`Sync completed for "${product.name}".`);
      await this.loadProducts();
    } finally {
      this.loading.set(false);
    }
  }

  viewHistory(product: MarketplaceProduct): void {
    this.router.navigate(['/admin', 'marketplace', 'products', product.id, 'history']);
  }

  async duplicateProduct(product: MarketplaceProduct): Promise<void> {
    if (!product.id) return;
    this.loading.set(true);
    try {
      await this.productSvc.duplicate(product.id);
      this.undoMessage.set(`Duplicated "${product.name}".`);
      await this.loadProducts();
    } finally {
      this.loading.set(false);
    }
  }

  async archiveProduct(product: MarketplaceProduct): Promise<void> {
    if (!product.id) return;
    await this.productSvc.archive(product.id);
    this.undoEntry.set({ type: 'archive', productIds: [product.id], products: [{ id: product.id, data: JSON.parse(JSON.stringify(product)) }], listings: [] });
    this.undoMessage.set(`Archived "${product.name}".`);
    await this.loadProducts();
  }

  async deleteProduct(product: MarketplaceProduct): Promise<void> {
    if (!product.id) return;
    const listings = this._allListings.filter(l => l.marketplaceProductId === product.id);
    for (const l of listings) { if (l.id) await this.listingSvc.delete(l.id); }
    await this.productSvc.delete(product.id);
    this.undoEntry.set({
      type: 'delete', productIds: [product.id],
      products: [{ id: product.id, data: JSON.parse(JSON.stringify(product)) }],
      listings: listings.map(l => ({ id: l.id!, data: JSON.parse(JSON.stringify(l)) })),
    });
    this.undoMessage.set(`Deleted "${product.name}".`);
    await this.loadProducts();
  }
}
