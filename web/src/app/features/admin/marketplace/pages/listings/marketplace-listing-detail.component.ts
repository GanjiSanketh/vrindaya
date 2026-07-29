import { Component, signal, inject, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MarketplaceLayoutComponent } from '../../layouts/marketplace-layout.component';
import { MarketplaceListingService } from '../../services/marketplace-listing.service';
import { MarketplaceProductService } from '../../services/marketplace-product.service';
import { MarketplaceLogService } from '../../services/marketplace-log.service';
import type { MarketplaceListing } from '../../models/marketplace-listing.model';
import type { MarketplaceProduct } from '../../models/marketplace-product.model';
import { MARKETPLACE_LABELS } from '../../models/marketplace-platform.model';

@Component({
  selector: 'app-marketplace-listing-detail',
  standalone: true,
  imports: [CommonModule, MarketplaceLayoutComponent],
  template: `
    <app-marketplace-layout title="Listing Detail" subtitle="View marketplace listing details and linked product information.">
      <div actions class="d-flex gap-2">
        <button class="btn btn-sm btn-outline-secondary" (click)="back()">&larr; Back</button>
        <button class="btn btn-sm btn-outline-primary" (click)="editing.set(!editing())" [disabled]="!listing()">
          {{ editing() ? 'Cancel' : 'Edit' }}
        </button>
        <button class="btn btn-sm btn-success" (click)="save()" [disabled]="!editing() || busy()">Save</button>
      </div>

      @if (error()) {
        <div class="alert alert-danger py-2 small border-0 d-flex justify-content-between mb-3">{{ error() }}<button class="btn btn-sm btn-link text-decoration-none text-danger p-0" (click)="error.set(null)">&times;</button></div>
      }
      @if (successMessage()) {
        <div class="alert alert-success py-2 small border-0 d-flex justify-content-between mb-3">{{ successMessage() }}<button class="btn btn-sm btn-link text-decoration-none text-success p-0" (click)="successMessage.set(null)">&times;</button></div>
      }

      @if (loading()) {
        <div class="text-center py-5"><div class="spinner-border text-primary"></div></div>
      } @else if (listing(); as l) {
        <div class="row g-4">
          <!-- Product Info -->
          <div class="col-12 col-md-4">
            <div class="card border-0 shadow-sm">
              <div class="card-header bg-white fw-semibold small py-2">Linked Product</div>
              <div class="card-body text-center">
                @if (product(); as p) {
                  @if (p.images.length) {
                    <img [src]="(p.images.find(i=>i.isPrimary)||p.images[0])!.url" alt="" class="rounded border mb-2" style="max-width:100%;height:120px;object-fit:cover" referrerpolicy="no-referrer" />
                  }
                  <h6 class="mb-1">{{ p.name }}</h6>
                  <div class="small text-muted mb-1">{{ p.brand }} {{ p.category ? '&middot; ' + p.category : '' }}</div>
                  <span class="badge bg-secondary bg-opacity-10 text-secondary">{{ p.status }}</span>
                } @else {
                  <div class="text-muted small py-3">No linked product</div>
                }
              </div>
            </div>
          </div>

          <!-- Listing Info -->
          <div class="col-12 col-md-8">
            <div class="card border-0 shadow-sm">
              <div class="card-header bg-white fw-semibold small py-2 d-flex justify-content-between align-items-center">
                <span>Listing Information</span>
                <span class="badge" [class]="statusBadge(l.publishStatus)">{{ l.publishStatus }}</span>
              </div>
              <div class="card-body">
                <div class="row g-3">
                  <div class="col-6">
                    <label class="small text-muted">Title</label>
                    @if (editing()) {
                      <input class="form-control form-control-sm" [value]="editTitle()" (input)="editTitle.set($any($event.target).value)" />
                    } @else {
                      <div class="fw-medium">{{ l.marketplaceTitle }}</div>
                    }
                  </div>
                  <div class="col-6">
                    <label class="small text-muted">Platform</label>
                    <div><span class="badge bg-secondary bg-opacity-10 text-secondary">{{ platformLabel(l.platform) }}</span></div>
                  </div>
                  <div class="col-6">
                    <label class="small text-muted">Marketplace SKU</label>
                    <div>{{ l.marketplaceSku || '-' }}</div>
                  </div>
                  <div class="col-6">
                    <label class="small text-muted">Seller SKU</label>
                    <div>{{ l.sellerSku || '-' }}</div>
                  </div>
                  <div class="col-6">
                    <label class="small text-muted">Listing URL</label>
                    <div>
                      @if (l.listingUrl) {
                        <a [href]="l.listingUrl" target="_blank" class="small">{{ l.listingUrl }}</a>
                      } @else { - }
                    </div>
                  </div>
                  <div class="col-6">
                    <label class="small text-muted">FSN / Listing ID</label>
                    <div class="small">{{ l.fsn || '-' }} / {{ l.marketplaceListingId || '-' }}</div>
                  </div>
                  <div class="col-6">
                    <label class="small text-muted">Listing Status</label>
                    <div><span class="badge" [class]="statusBadge(l.listingStatus)">{{ l.listingStatus }}</span></div>
                  </div>
                  <div class="col-6">
                    <label class="small text-muted">AI Status</label>
                    <div><span class="badge" [class]="aiBadge(l.aiStatus)">{{ l.aiStatus }}</span></div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Pricing -->
            <div class="card border-0 shadow-sm mt-3">
              <div class="card-header bg-white fw-semibold small py-2">Pricing</div>
              <div class="card-body">
                <div class="row g-3">
                  <div class="col-4">
                    <label class="small text-muted">Selling Price</label>
                    <div class="fw-medium">&commat;{{ l.pricing.sellingPrice }}</div>
                  </div>
                  <div class="col-4">
                    <label class="small text-muted">MRP</label>
                    <div class="text-muted">&commat;{{ l.pricing.mrp }}</div>
                  </div>
                  <div class="col-4">
                    <label class="small text-muted">Wholesale Price</label>
                    <div class="text-muted">&commat;{{ (l.pricing)?.wholesalePrice ?? '-' }}</div>
                  </div>
                  <div class="col-4">
                    <label class="small text-muted">Tax Rate (%)</label>
                    <div>{{ (l.pricing)?.taxRate ?? '-' }}</div>
                  </div>
                  <div class="col-4">
                    <label class="small text-muted">Shipping Charge</label>
                    <div>&commat;{{ (l.pricing)?.shippingCharge ?? '-' }}</div>
                  </div>
                  <div class="col-4">
                    <label class="small text-muted">Discount %</label>
                    <div>{{ (l.pricing)?.discountPercent ?? '-' }}</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Inventory -->
            <div class="card border-0 shadow-sm mt-3">
              <div class="card-header bg-white fw-semibold small py-2">Inventory</div>
              <div class="card-body">
                <div class="row g-3">
                  <div class="col-4">
                    <label class="small text-muted">Available</label>
                    <div>{{ l.inventory.availableStock }}</div>
                  </div>
                  <div class="col-4">
                    <label class="small text-muted">Fulfillment</label>
                    <div>{{ l.fulfillmentType || '-' }}</div>
                  </div>
                  <div class="col-4">
                    <label class="small text-muted">Handling Time</label>
                    <div>{{ l.handlingTimeDays ? l.handlingTimeDays + ' days' : '-' }}</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Description -->
            <div class="card border-0 shadow-sm mt-3">
              <div class="card-header bg-white fw-semibold small py-2">Description</div>
              <div class="card-body">
                <div class="small text-muted" style="white-space:pre-wrap">{{ l.marketplaceDescription || 'No description' }}</div>
              </div>
            </div>

            <!-- Timestamps -->
            <div class="card border-0 shadow-sm mt-3">
              <div class="card-header bg-white fw-semibold small py-2">Timestamps</div>
              <div class="card-body">
                <div class="row g-3 small text-muted">
                  <div class="col-4">Created: {{ formatDate(l.createdAt) }}</div>
                  <div class="col-4">Updated: {{ formatDate(l.updatedAt) }}</div>
                  <div class="col-4">Published: {{ formatDate(l.publishedAt) || '-' }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      }
    </app-marketplace-layout>
  `,
  styles: [`
    .card-header{font-size:.78rem}
    .card-body label{display:block;font-size:.72rem;margin-bottom:.1rem}
    .card-body{font-size:.82rem}
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MarketplaceListingDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly listingSvc = inject(MarketplaceListingService);
  private readonly productSvc = inject(MarketplaceProductService);
  private readonly logSvc = inject(MarketplaceLogService);

  readonly LABELS = MARKETPLACE_LABELS;

  platformLabel(p: string): string {
    return (this.LABELS as Record<string, string>)[p] || p;
  }

  readonly listing = signal<MarketplaceListing | null>(null);
  readonly product = signal<MarketplaceProduct | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);
  readonly editing = signal(false);
  readonly busy = signal(false);

  readonly editTitle = signal('');

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) this.loadListing(id);
  }

  private async loadListing(id: string): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const l = await this.listingSvc.getById(id);
      if (!l) { this.error.set('Listing not found'); return; }
      this.listing.set(l);
      this.editTitle.set(l.marketplaceTitle);
      if (l.marketplaceProductId) {
        try {
          const p = await this.productSvc.getById(l.marketplaceProductId);
          this.product.set(p);
        } catch { /* product may be deleted */ }
      }
    } catch (e: any) {
      this.error.set(e?.message || 'Failed to load listing');
    } finally {
      this.loading.set(false);
    }
  }

  async save(): Promise<void> {
    const l = this.listing();
    if (!l) return;
    this.busy.set(true);
    this.error.set(null);
    this.successMessage.set(null);
    try {
      await this.listingSvc.update(l.id!, { marketplaceTitle: this.editTitle() } as any);
      this.successMessage.set('Listing updated.');
      this.editing.set(false);
      await this.loadListing(l.id!);
    } catch (e: any) {
      this.error.set(e?.message || 'Save failed');
    } finally {
      this.busy.set(false);
    }
  }

  back(): void {
    this.router.navigate(['/admin', 'marketplace', 'listings']);
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

  formatDate(d: Date | string | undefined): string {
    if (!d) return '-';
    const dt = typeof d === 'string' ? new Date(d) : d;
    return dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
}
