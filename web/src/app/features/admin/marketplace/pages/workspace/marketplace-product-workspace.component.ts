import { Component, OnInit, OnDestroy, signal, computed, inject, isDevMode, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { MarketplaceProductService } from '../../services/marketplace-product.service';
import { MarketplaceListingService } from '../../services/marketplace-listing.service';
import { SyncEngineService } from '../../services/sync/sync-engine.service';
import { MarketplaceSyncService } from '../../services/marketplace-sync.service';
import { MarketplaceLogService } from '../../services/marketplace-log.service';
import { AITestingService, type ListingInput, type GeneratedContent } from '../../services/ai-listing.service';
import { VisionAnalysisService } from '../../services/vision-analysis.service';
import { MarketplaceOperationService } from '../../services/providers/marketplace-operation.service';
import type { MarketplaceProduct } from '../../models/marketplace-product.model';
import type { MarketplaceListing } from '../../models/marketplace-listing.model';
import type { MarketplacePlatformType } from '../../models/marketplace-platform.model';
import type { MarketplaceImage } from '../../models/marketplace-image.model';
import type { MarketplaceSync } from '../../models/marketplace-sync.model';
import type { MarketplaceLog } from '../../models/marketplace-log.model';
import type { VisionAnalysisResult } from '../../models/vision-analysis.model';
import type { MarketplaceAttribute } from '../../models/marketplace-attribute.model';
import type { ContentVersion } from '../../services/ai-listing.service';
import { MARKETPLACE_LABELS } from '../../models/marketplace-platform.model';

type RightTab = 'general' | 'flipkart' | 'meesho' | 'amazon' | 'seo' | 'ai' | 'history';

@Component({
  selector: 'app-marketplace-product-workspace',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, DatePipe],
  template: `
    <div class="ws-page">
      <div class="ws-header">
        <div class="d-flex align-items-center gap-2">
          <a routerLink="/admin/marketplace/products" class="btn btn-sm btn-light border">&larr; Products</a>
          <div>
            <h1 class="ws-title">{{ draftProduct()?.name || 'Loading...' }}</h1>
            @if (product()) {
              <div class="d-flex align-items-center gap-2 mt-1">
                <span class="badge" [class]="productStatusBadge(product()!.status)">{{ product()!.status }}</span>
                <span class="small text-muted">v{{ product()!.version }}</span>
                @if (lastSaved()) {
                  <span class="small text-muted">Saved {{ lastSaved() | date:'shortTime' }}</span>
                }
                @if (dirty()) {
                  <span class="small text-warning">Unsaved changes</span>
                }
                @if (saving()) {
                  <span class="small text-info">Saving...</span>
                }
              </div>
            }
          </div>
        </div>
        <div class="ws-actions d-flex gap-2 flex-wrap">
          <button class="btn btn-sm btn-primary" (click)="save()" [disabled]="saving() || !dirty()">
            @if (saving()) { Saving... } @else { Save }
          </button>
          <button class="btn btn-sm btn-outline-primary" (click)="generateAi()" [disabled]="generating()">
            @if (generating()) { Generating... } @else { Generate AI }
          </button>
          <button class="btn btn-sm btn-outline-success" (click)="publish()" [disabled]="publishing()">
            @if (publishing()) { Publishing... } @else { Publish }
          </button>
          <button class="btn btn-sm btn-outline-info" (click)="sync()" [disabled]="syncing()">
            @if (syncing()) { Syncing... } @else { Sync }
          </button>
          <button class="btn btn-sm btn-outline-secondary" (click)="preview()">Preview</button>
          <button class="btn btn-sm btn-outline-warning" (click)="regenerate()" [disabled]="generating()">
            @if (generating()) { Regenerating... } @else { Regenerate }
          </button>
        </div>
      </div>

      <div class="ws-grid">
        <div class="ws-left">
          <div class="card border-0 shadow-sm mb-3">
            <div class="card-header bg-white fw-semibold py-2" style="font-size:.85rem">Product Images</div>
            <div class="card-body p-2">
              @if (productImages().length) {
                <div class="d-flex flex-wrap gap-2">
                  @for (img of productImages(); track img.url; let i = $index) {
                    <div class="position-relative" style="width:72px;height:72px">
                      <img [src]="img.url" [alt]="img.altText" class="rounded border" loading="lazy" style="width:100%;height:100%;object-fit:cover" referrerpolicy="no-referrer" (click)="setPrimaryImage(i)" />
                      @if (img.isPrimary) {
                        <span class="position-absolute top-0 start-0 badge bg-primary bg-opacity-75 px-1" style="font-size:.6rem">P</span>
                      }
                      <button class="position-absolute top-0 end-0 btn p-0 lh-1 text-danger" style="font-size:.75rem;line-height:1" (click)="removeImage(i)">&times;</button>
                    </div>
                  }
                </div>
              } @else {
                <div class="text-center py-3 text-muted small">No images</div>
              }
              <div class="mt-2">
                <input #imgFileInput type="file" accept="image/*" class="d-none" (change)="addImage($event)" />
                <button class="btn btn-sm btn-outline-primary w-100" (click)="imgFileInput.click()">+ Add Image</button>
              </div>
            </div>
          </div>

          <div class="card border-0 shadow-sm mb-3">
            <div class="card-header bg-white fw-semibold py-2 d-flex justify-content-between align-items-center" style="font-size:.85rem">
              <span>Vision Analysis</span>
              @if (product() && primaryImageUrl()) {
                <button class="btn btn-sm btn-outline-info py-0 px-2" (click)="analyzeVision()" [disabled]="analyzing()">
                  @if (analyzing()) { Analyzing... } @else { Analyze }
                </button>
              }
            </div>
            <div class="card-body p-2">
              @if (visionResult(); as vr) {
                <div style="font-size:.78rem">
                  <div class="d-flex justify-content-between mb-1"><span class="text-muted">Category</span><span>{{ vr.category }}</span></div>
                  <div class="d-flex justify-content-between mb-1"><span class="text-muted">Fabric</span><span>{{ vr.fabric }}</span></div>
                  <div class="d-flex justify-content-between mb-1"><span class="text-muted">Colour</span><span>{{ vr.colour }}</span></div>
                  <div class="d-flex justify-content-between mb-1"><span class="text-muted">Sleeve</span><span>{{ vr.sleeve }}</span></div>
                  <div class="d-flex justify-content-between mb-1"><span class="text-muted">Neck</span><span>{{ vr.neck }}</span></div>
                  <div class="d-flex justify-content-between mb-1"><span class="text-muted">Fit</span><span>{{ vr.fit }}</span></div>
                  <div class="d-flex justify-content-between mb-1"><span class="text-muted">Length</span><span>{{ vr.length }}</span></div>
                  <div class="d-flex justify-content-between mb-1"><span class="text-muted">Occasion</span><span>{{ vr.occasion }}</span></div>
                  @if (vr.confidenceScore) {
                    <div class="mt-1"><span class="text-muted">Confidence:</span>
                      <div class="progress" style="height:4px"><div class="progress-bar" [style.width.%]="vr.confidenceScore * 100"></div></div>
                    </div>
                  }
                </div>
              } @else {
                <div class="text-center py-3 text-muted small">Select a primary image and click Analyze</div>
              }
            </div>
          </div>
        </div>

        <div class="ws-center">
          <div class="card border-0 shadow-sm">
            <div class="card-header bg-white fw-semibold py-2 d-flex justify-content-between align-items-center" style="font-size:.85rem">
              <span>Listing Editor</span>
              <span class="text-muted small">{{ activePlatformLabel() }}</span>
            </div>
            <div class="card-body">
              @if (draftProduct(); as p) {
                <div class="row g-3">
                  <div class="col-12">
                    <label class="form-label small fw-medium">Title</label>
                    <input class="form-control form-control-sm" [ngModel]="p.name" (ngModelChange)="updateProduct('name', $event)" />
                  </div>
                  <div class="col-12">
                    <label class="form-label small fw-medium">Description</label>
                    <textarea class="form-control form-control-sm" rows="4" [ngModel]="p.description" (ngModelChange)="updateProduct('description', $event)"></textarea>
                  </div>
                  <div class="col-12">
                    <label class="form-label small fw-medium">Highlights</label>
                    @for (h of p.highlights; track idx; let idx = $index) {
                      <div class="input-group input-group-sm mb-1">
                        <input class="form-control" [ngModel]="h" (ngModelChange)="updateHighlight(idx, $event)" />
                        <button class="btn btn-outline-danger" (click)="removeHighlight(idx)">&times;</button>
                      </div>
                    }
                    <button class="btn btn-sm btn-outline-primary mt-1" (click)="addHighlight()">+ Add</button>
                  </div>
                  <div class="col-12">
                    <label class="form-label small fw-medium">SEO Keywords</label>
                    <input class="form-control form-control-sm" [ngModel]="p.seo.focusKeyword || ''" (ngModelChange)="updateSeo('focusKeyword', $event)" />
                  </div>
                  <div class="col-12">
                    <label class="form-label small fw-medium">Specifications</label>
                    @for (s of p.specifications; track idx; let idx = $index) {
                      <div class="row g-1 mb-1">
                        <div class="col-5"><input class="form-control form-control-sm" placeholder="Label" [ngModel]="s.label" (ngModelChange)="updateSpecLabel(idx, $event)" /></div>
                        <div class="col-5"><input class="form-control form-control-sm" placeholder="Value" [ngModel]="s.value" (ngModelChange)="updateSpecValue(idx, $event)" /></div>
                        <div class="col-2"><button class="btn btn-sm btn-outline-danger" (click)="removeSpecification(idx)">&times;</button></div>
                      </div>
                    }
                    <button class="btn btn-sm btn-outline-primary mt-1" (click)="addSpecification()">+ Add</button>
                  </div>
                  <div class="col-md-4">
                    <label class="form-label small fw-medium">Fabric</label>
                    <input class="form-control form-control-sm" [ngModel]="getAttr('fabric')" (ngModelChange)="setAttr('fabric', $event)" />
                  </div>
                  <div class="col-md-4">
                    <label class="form-label small fw-medium">Sleeve</label>
                    <input class="form-control form-control-sm" [ngModel]="getAttr('sleeve')" (ngModelChange)="setAttr('sleeve', $event)" />
                  </div>
                  <div class="col-md-4">
                    <label class="form-label small fw-medium">Fit</label>
                    <input class="form-control form-control-sm" [ngModel]="getAttr('fit')" (ngModelChange)="setAttr('fit', $event)" />
                  </div>
                  <div class="col-md-4">
                    <label class="form-label small fw-medium">Pattern</label>
                    <input class="form-control form-control-sm" [ngModel]="getAttr('pattern')" (ngModelChange)="setAttr('pattern', $event)" />
                  </div>
                  <div class="col-md-4">
                    <label class="form-label small fw-medium">Occasion</label>
                    <input class="form-control form-control-sm" [ngModel]="getAttr('occasion')" (ngModelChange)="setAttr('occasion', $event)" />
                  </div>
                  <div class="col-md-4">
                    <label class="form-label small fw-medium">Neck</label>
                    <input class="form-control form-control-sm" [ngModel]="getAttr('neck')" (ngModelChange)="setAttr('neck', $event)" />
                  </div>
                  <div class="col-md-6">
                    <label class="form-label small fw-medium">Package Contents</label>
                    <input class="form-control form-control-sm" [ngModel]="p.packageContents" (ngModelChange)="updateProduct('packageContents', $event)" />
                  </div>
                  <div class="col-md-3">
                    <label class="form-label small fw-medium">HSN Code</label>
                    <input class="form-control form-control-sm" [ngModel]="p.hsn" (ngModelChange)="updateProduct('hsn', $event)" />
                  </div>
                  <div class="col-md-3">
                    <label class="form-label small fw-medium">GST (%)</label>
                    <input type="number" class="form-control form-control-sm" [ngModel]="p.gst" (ngModelChange)="updateProduct('gst', +$event)" />
                  </div>
                  <div class="col-md-6">
                    <label class="form-label small fw-medium">Country of Origin</label>
                    <input class="form-control form-control-sm" [ngModel]="p.countryOfOrigin" (ngModelChange)="updateProduct('countryOfOrigin', $event)" />
                  </div>
                  @if (activeListingForPlatform(); as listing) {
                    <div class="col-md-3">
                      <label class="form-label small fw-medium">Price ({{ activePlatformLabel() }})</label>
                      <input type="number" class="form-control form-control-sm" [ngModel]="listing.pricing.sellingPrice" (ngModelChange)="updateListingPrice($event)" />
                    </div>
                    <div class="col-md-3">
                      <label class="form-label small fw-medium">Stock ({{ activePlatformLabel() }})</label>
                      <input type="number" class="form-control form-control-sm" [ngModel]="listing.inventory.totalStock" (ngModelChange)="updateListingStock($event)" />
                    </div>
                  }
                </div>
              } @else if (loading()) {
                <div class="text-center py-5 text-muted">Loading product workspace...</div>
              } @else {
                <div class="text-center py-5 text-muted">Product not found.</div>
              }
            </div>
          </div>
        </div>

        <div class="ws-right">
          <div class="card border-0 shadow-sm">
            <div class="card-header bg-white p-0">
              <ul class="nav nav-tabs border-0" style="font-size:.8rem">
                @for (tab of rightTabs; track tab) {
                  <li class="nav-item">
                    <button class="nav-link border-0 rounded-0 px-2 py-2" [class.active]="rightTab() === tab" [class.fw-semibold]="rightTab() === tab" (click)="rightTab.set(tab)">{{ tabLabels[tab] }}</button>
                  </li>
                }
              </ul>
            </div>
            <div class="card-body p-2" style="font-size:.82rem;max-height:calc(100vh - 240px);overflow-y:auto">
              @if (rightTab() === 'general') {
                @if (product(); as p) {
                  <div class="mb-2"><span class="text-muted">Status</span><br><span class="badge" [class]="productStatusBadge(p.status)">{{ p.status }}</span></div>
                  <div class="mb-2"><span class="text-muted">Category</span><br>{{ p.category || '-' }}</div>
                  <div class="mb-2"><span class="text-muted">Subcategory</span><br>{{ p.subcategory || '-' }}</div>
                  <div class="mb-2"><span class="text-muted">Brand</span><br>{{ p.brand || '-' }}</div>
                  <div class="mb-2"><span class="text-muted">Product Type</span><br>{{ p.productType || '-' }}</div>
                  <div class="mb-2"><span class="text-muted">Gender</span><br>{{ p.gender || '-' }}</div>
                  <div class="mb-2"><span class="text-muted">Website Product ID</span><br><code style="font-size:.75rem">{{ p.websiteProductId }}</code></div>
                  <div class="mb-2"><span class="text-muted">Version</span><br>{{ p.version }}</div>
                  <div class="mb-2"><span class="text-muted">Created</span><br>{{ p.createdAt | date:'medium' }}</div>
                  <div class="mb-2"><span class="text-muted">Updated</span><br>{{ p.updatedAt | date:'medium' }}</div>
                  <div class="mb-2"><span class="text-muted">Tags</span><br>{{ p.tags.length ? p.tags.join(', ') : '-' }}</div>
                }
              }
              @if (activePlatform(); as platform) {
                @if (getListingForPlatform(platform); as listing) {
                  <div class="mb-2"><span class="text-muted">Listing Status</span><br><span class="badge" [class]="listingStatusBadge(listing.listingStatus)">{{ listing.listingStatus }}</span></div>
                  <div class="mb-2"><span class="text-muted">Publish Status</span><br><span class="badge" [class]="publishStatusBadge(listing.publishStatus)">{{ listing.publishStatus }}</span></div>
                  <div class="mb-2"><span class="text-muted">AI Status</span><br><span class="badge" [class]="aiStatusBadge(listing.aiStatus)">{{ listing.aiStatus === 'not_applicable' ? 'N/A' : listing.aiStatus }}</span></div>
                  <hr class="my-2">
                  <div class="mb-2"><span class="text-muted">SKU</span><br><code style="font-size:.75rem">{{ listing.marketplaceSku || '-' }}</code></div>
                  <div class="mb-2"><span class="text-muted">Seller SKU</span><br><code style="font-size:.75rem">{{ listing.sellerSku || '-' }}</code></div>
                  <div class="mb-2"><span class="text-muted">FSN</span><br><code style="font-size:.75rem">{{ listing.fsn || '-' }}</code></div>
                  @if (listing.listingUrl) {
                    <div class="mb-2"><span class="text-muted">URL</span><br><a [href]="listing.listingUrl" target="_blank" class="small" style="word-break:break-all">{{ listing.listingUrl }}</a></div>
                  }
                  <hr class="my-2">
                  <div class="mb-2"><span class="text-muted">MRP</span><br>{{ listing.pricing.mrp | currency:'INR':'symbol':'1.0-0' }}</div>
                  <div class="mb-2"><span class="text-muted">Selling Price</span><br>{{ listing.pricing.sellingPrice | currency:'INR':'symbol':'1.0-0' }}</div>
                  <div class="mb-2"><span class="text-muted">Discount</span><br>{{ listing.pricing.discountPercent }}%</div>
                  <div class="mb-2"><span class="text-muted">Shipping</span><br>{{ listing.pricing.shippingCharge | currency:'INR':'symbol':'1.0-0' }}</div>
                  <hr class="my-2">
                  <div class="mb-2"><span class="text-muted">Total Stock</span><br>{{ listing.inventory.totalStock }}</div>
                  <div class="mb-2"><span class="text-muted">Available</span><br>{{ listing.inventory.availableStock }}</div>
                  <div class="mb-2"><span class="text-muted">Stock Status</span><br><span class="badge" [class]="stockStatusBadge(listing.inventory.stockStatus)">{{ listing.inventory.stockStatus }}</span></div>
                  <hr class="my-2">
                  <div class="mb-2"><span class="text-muted">Fulfillment</span><br>{{ listing.fulfillmentType }}</div>
                  <div class="mb-2"><span class="text-muted">Handling Time</span><br>{{ listing.handlingTimeDays }} days</div>
                  <div class="mb-2"><span class="text-muted">Return Policy</span><br>{{ listing.returnPolicy || '-' }}</div>
                  <div class="mb-2"><span class="text-muted">Weight</span><br>{{ listing.shippingWeight }} {{ listing.shippingWeightUnit }}</div>
                } @else {
                  <div class="text-center py-4 text-muted small">Not listed on this platform.</div>
                }
              }
              @if (rightTab() === 'seo') {
                @if (draftProduct(); as p) {
                  <div class="mb-2">
                    <label class="form-label small fw-medium mb-0">Meta Title</label>
                    <input class="form-control form-control-sm" [ngModel]="p.seo.metaTitle" (ngModelChange)="updateSeo('metaTitle', $event)" />
                  </div>
                  <div class="mb-2">
                    <label class="form-label small fw-medium mb-0">Meta Description</label>
                    <textarea class="form-control form-control-sm" rows="2" [ngModel]="p.seo.metaDescription" (ngModelChange)="updateSeo('metaDescription', $event)"></textarea>
                  </div>
                  <div class="mb-2">
                    <label class="form-label small fw-medium mb-0">Focus Keyword</label>
                    <input class="form-control form-control-sm" [ngModel]="p.seo.focusKeyword" (ngModelChange)="updateSeo('focusKeyword', $event)" />
                  </div>
                  <div class="mb-2">
                    <label class="form-label small fw-medium mb-0">Slug</label>
                    <input class="form-control form-control-sm" [ngModel]="p.seo.slug" (ngModelChange)="updateSeo('slug', $event)" />
                  </div>
                  <div class="mb-2">
                    <label class="form-label small fw-medium mb-0">Canonical URL</label>
                    <input class="form-control form-control-sm" [ngModel]="p.seo.canonicalUrl" (ngModelChange)="updateSeo('canonicalUrl', $event)" />
                  </div>
                  <div class="mb-2">
                    <label class="form-label small fw-medium mb-0">OG Title</label>
                    <input class="form-control form-control-sm" [ngModel]="p.seo.ogTitle" (ngModelChange)="updateSeo('ogTitle', $event)" />
                  </div>
                  <div class="mb-2">
                    <label class="form-label small fw-medium mb-0">OG Description</label>
                    <textarea class="form-control form-control-sm" rows="2" [ngModel]="p.seo.ogDescription" (ngModelChange)="updateSeo('ogDescription', $event)"></textarea>
                  </div>
                  <div class="form-check mb-2">
                    <input class="form-check-input" type="checkbox" id="seo-noindex" [ngModel]="p.seo.noIndex" (ngModelChange)="updateSeo('noIndex', $event)" />
                    <label class="form-check-label small" for="seo-noindex">No Index</label>
                  </div>
                }
              }
              @if (rightTab() === 'ai') {
                <div class="mb-2">
                  <span class="fw-semibold small">AI Content Versions</span>
                </div>
                @if (aiVersions().length) {
                  @for (v of aiVersions(); track v.id; let i = $index) {
                    <div class="border rounded p-2 mb-2" style="background:#fafafa">
                      <div class="d-flex justify-content-between mb-1">
                        <span class="small fw-medium">v{{ aiVersions().length - i }}</span>
                        <span class="small text-muted">{{ v.createdAt | date:'short' }}</span>
                      </div>
                      <div class="small mb-1"><span class="text-muted">Provider:</span> {{ v.provider }} / {{ v.model }}</div>
                      <div class="small text-truncate" [title]="v.content.title"><span class="text-muted">Title:</span> {{ v.content.title }}</div>
                      <button class="btn btn-sm btn-link text-decoration-none p-0 small" (click)="applyAiVersion(v.content)">Apply</button>
                    </div>
                  }
                } @else {
                  <div class="text-center py-4 text-muted small">No AI content generated yet. Click Generate AI to create.</div>
                }
                <button class="btn btn-sm btn-outline-primary w-100 mt-2" (click)="generateAi()">Generate New Content</button>
              }
              @if (rightTab() === 'history') {
                <div class="mb-2 d-flex justify-content-between align-items-center">
                  <span class="fw-semibold small">Sync History</span>
                </div>
                @if (syncHistory().length) {
                  @for (s of syncHistory(); track s.id) {
                    <div class="border-bottom py-1 small d-flex justify-content-between align-items-center">
                      <div>
                        <span class="badge" [class]="syncStatusBadge(s.status)" style="font-size:.65rem">{{ s.status }}</span>
                        <span class="ms-1">{{ s.action }}</span>
                        <span class="text-muted ms-1">{{ s.platform }}</span>
                      </div>
                      <span class="text-muted" style="font-size:.7rem">{{ s.createdAt | date:'short' }}</span>
                    </div>
                  }
                } @else {
                  <div class="text-center py-4 text-muted small">No sync history found.</div>
                }
                <hr class="my-2">
                <div class="mb-2 fw-semibold small">Activity Log</div>
                @if (activityLog().length) {
                  @for (log of activityLog(); track log.id) {
                    <div class="border-bottom py-1 small">
                      <span class="badge" [class]="logTypeBadge(log.type)" style="font-size:.65rem">{{ log.type }}</span>
                      <span class="ms-1">{{ log.message }}</span>
                      <div class="text-muted" style="font-size:.7rem">{{ log.createdAt | date:'short' }}</div>
                    </div>
                  }
                } @else {
                  <div class="text-center py-4 text-muted small">No activity log.</div>
                }
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .ws-page{height:100%;display:flex;flex-direction:column;background:#f5f5f7}
    .ws-header{display:flex;justify-content:space-between;align-items:flex-start;padding:.75rem 1rem;background:#fff;border-bottom:1px solid #e0e0e0;flex-wrap:wrap;gap:.5rem}
    .ws-title{font-family:'Cormorant Garamond',serif;font-size:1.3rem;font-weight:700;color:#1a1a2e;margin:0}
    .ws-actions button{font-size:.8rem}
    .ws-grid{display:grid;grid-template-columns:260px 1fr 300px;gap:1rem;padding:1rem;flex:1;overflow:hidden;min-height:0}
    .ws-left,.ws-center,.ws-right{overflow-y:auto;min-height:0}
    .ws-left .card,.ws-center .card,.ws-right .card{height:auto}
    .ws-center{overflow-y:auto}
    .ws-center .card-body{overflow-y:auto}
    .form-label{color:#555;margin-bottom:.15rem;font-size:.78rem}
    .nav-tabs .nav-link{color:#666;padding:.35rem .6rem;font-size:.78rem}
    .nav-tabs .nav-link.active{color:#1a1a2e;background:#f0f0f5;border-bottom:2px solid #1a1a2e}
    .nav-tabs .nav-link:hover{color:#1a1a2e;background:#f8f8fa}
    @media(max-width:1200px){.ws-grid{grid-template-columns:220px 1fr 260px}}
    @media(max-width:992px){.ws-grid{grid-template-columns:1fr;grid-template-rows:auto 1fr auto}}
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MarketplaceProductWorkspaceComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly productSvc = inject(MarketplaceProductService);
  private readonly listingSvc = inject(MarketplaceListingService);
  private readonly syncEngine = inject(SyncEngineService);
  private readonly syncSvc = inject(MarketplaceSyncService);
  private readonly logSvc = inject(MarketplaceLogService);
  private readonly aiTestingSvc = inject(AITestingService);
  private readonly visionSvc = inject(VisionAnalysisService);
  private readonly operationSvc = inject(MarketplaceOperationService);

  readonly platforms: MarketplacePlatformType[] = ['flipkart', 'meesho', 'amazon'];
  readonly labels = MARKETPLACE_LABELS;

  readonly rightTabs: RightTab[] = ['general', 'flipkart', 'meesho', 'amazon', 'seo', 'ai', 'history'];
  readonly tabLabels: Record<RightTab, string> = {
    general: 'General', flipkart: 'Flipkart', meesho: 'Meesho', amazon: 'Amazon',
    seo: 'SEO', ai: 'AI', history: 'History',
  };

  // --- State ---
  productId = signal('');
  product = signal<MarketplaceProduct | null>(null);
  listings = signal<MarketplaceListing[]>([]);
  loading = signal(true);
  saving = signal(false);
  dirty = signal(false);
  lastSaved = signal<Date | null>(null);
  rightTab = signal<RightTab>('general');

  // Autosave
  generating = signal(false);
  publishing = signal(false);
  syncing = signal(false);
  analyzing = signal(false);

  // Draft state (deep copy for editing)
  private _draftProduct: MarketplaceProduct | null = null;
  draftProduct = signal<MarketplaceProduct | null>(null);

  private _draftListings: MarketplaceListing[] = [];
  draftListings = signal<MarketplaceListing[]>([]);

  // AI versions
  aiVersions = signal<ContentVersion[]>([]);

  // Sync history
  syncHistory = signal<MarketplaceSync[]>([]);
  activityLog = signal<MarketplaceLog[]>([]);

  // Vision result
  visionResult = signal<VisionAnalysisResult | null>(null);

  // Autosave timer
  private _autosaveTimer: any;
  private _destroy$ = new Subject<void>();

  // Computed
  activePlatformLabel = computed(() => {
    const tab = this.rightTab();
    if (tab === 'general' || tab === 'seo' || tab === 'ai' || tab === 'history') return 'General';
    return this.labels[tab as MarketplacePlatformType] || 'General';
  });

  productImages = computed(() => this.draftProduct()?.images ?? []);
  primaryImageUrl = computed(() => this.productImages().find(i => i.isPrimary)?.url ?? this.productImages()[0]?.url ?? '');
  activePlatform = computed(() => {
    const tab = this.rightTab();
    if (tab === 'general' || tab === 'seo' || tab === 'ai' || tab === 'history') return null;
    return tab as MarketplacePlatformType;
  });

  activeListingForPlatform = computed(() => {
    const tab = this.rightTab();
    if (tab === 'general' || tab === 'seo' || tab === 'ai' || tab === 'history') {
      return this._draftListings[0] ?? null;
    }
    return this._draftListings.find(l => l.platform === tab) ?? null;
  });

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntil(this._destroy$)).subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.productId.set(id);
        this.loadWorkspace(id);
      }
    });

    const history = this.visionSvc.history();
    if (history.length) {
      this.visionResult.set(history[0]);
    }
  }

  ngOnDestroy(): void {
    clearTimeout(this._autosaveTimer);
    this._destroy$.next();
    this._destroy$.complete();
  }

  private async loadWorkspace(id: string): Promise<void> {
    this.loading.set(true);
    try {
      const [product, listings, syncs, logs] = await Promise.all([
        this.productSvc.getById(id),
        this.listingSvc.getByProductId(id),
        this.loadSyncHistory(id),
        this.loadActivityLog(id),
      ]);

      if (!product) {
        this.loading.set(false);
        return;
      }

      this.product.set(product);
      this._draftProduct = JSON.parse(JSON.stringify(product));
      this.draftProduct.set(this._draftProduct);

      this._draftListings = JSON.parse(JSON.stringify(listings));
      this.draftListings.set(this._draftListings);
      this.listings.set(listings);

      this.syncHistory.set(syncs);
      this.activityLog.set(logs);
    } finally {
      this.loading.set(false);
    }
  }

  private async loadSyncHistory(productId: string): Promise<MarketplaceSync[]> {
    try {
      const result = await this.syncSvc.getAll({
        filters: [{ field: 'marketplaceProductId', op: '==', value: productId }],
        sortField: 'createdAt',
        sortDirection: 'desc',
        pageSize: 50,
      });
      return result.items;
    } catch {
      return [];
    }
  }

  private async loadActivityLog(productId: string): Promise<MarketplaceLog[]> {
    try {
      const result = await this.logSvc.getAll({
        filters: [{ field: 'marketplaceProductId', op: '==', value: productId }],
        sortField: 'createdAt',
        sortDirection: 'desc',
        pageSize: 50,
      });
      return result.items;
    } catch {
      return [];
    }
  }

  // --- Draft field updates ---

  updateProduct(field: string, value: unknown): void {
    if (!this._draftProduct) return;
    this._draftProduct = { ...this._draftProduct, [field]: value };
    this.draftProduct.set(this._draftProduct);
    this.markDirty();
  }

  updateSeo(field: string, value: unknown): void {
    if (!this._draftProduct) return;
    const seo = { ...this._draftProduct.seo, [field]: value };
    this._draftProduct = { ...this._draftProduct, seo };
    this.draftProduct.set(this._draftProduct);
    this.markDirty();
  }

  updateHighlight(index: number, value: string): void {
    if (!this._draftProduct) return;
    const highlights = [...this._draftProduct.highlights];
    highlights[index] = value;
    this._draftProduct = { ...this._draftProduct, highlights };
    this.draftProduct.set(this._draftProduct);
    this.markDirty();
  }

  addHighlight(): void {
    if (!this._draftProduct) return;
    this._draftProduct = { ...this._draftProduct, highlights: [...this._draftProduct.highlights, ''] };
    this.draftProduct.set(this._draftProduct);
    this.markDirty();
  }

  removeHighlight(index: number): void {
    if (!this._draftProduct) return;
    this._draftProduct = {
      ...this._draftProduct,
      highlights: this._draftProduct.highlights.filter((_, i) => i !== index),
    };
    this.draftProduct.set(this._draftProduct);
    this.markDirty();
  }

  updateSpecLabel(index: number, value: string): void {
    if (!this._draftProduct) return;
    const specs = [...this._draftProduct.specifications];
    specs[index] = { ...specs[index], label: value };
    this._draftProduct = { ...this._draftProduct, specifications: specs };
    this.draftProduct.set(this._draftProduct);
    this.markDirty();
  }

  updateSpecValue(index: number, value: string): void {
    if (!this._draftProduct) return;
    const specs = [...this._draftProduct.specifications];
    specs[index] = { ...specs[index], value };
    this._draftProduct = { ...this._draftProduct, specifications: specs };
    this.draftProduct.set(this._draftProduct);
    this.markDirty();
  }

  addSpecification(): void {
    if (!this._draftProduct) return;
    this._draftProduct = {
      ...this._draftProduct,
      specifications: [...this._draftProduct.specifications, { label: '', value: '' }],
    };
    this.draftProduct.set(this._draftProduct);
    this.markDirty();
  }

  removeSpecification(index: number): void {
    if (!this._draftProduct) return;
    this._draftProduct = {
      ...this._draftProduct,
      specifications: this._draftProduct.specifications.filter((_, i) => i !== index),
    };
    this.draftProduct.set(this._draftProduct);
    this.markDirty();
  }

  getAttr(name: string): string {
    return this._draftProduct?.attributes?.find(a => a.name.toLowerCase() === name.toLowerCase())?.value ?? '';
  }

  setAttr(name: string, value: string): void {
    if (!this._draftProduct) return;
    const attrs = [...(this._draftProduct.attributes || [])];
    const idx = attrs.findIndex(a => a.name.toLowerCase() === name.toLowerCase());
    if (idx >= 0) {
      attrs[idx] = { ...attrs[idx], value };
    } else {
      attrs.push({
        name, value, source: 'manual', isRequired: false, isCustom: true, order: attrs.length,
      } as MarketplaceAttribute);
    }
    this._draftProduct = { ...this._draftProduct, attributes: attrs };
    this.draftProduct.set(this._draftProduct);
    this.markDirty();
  }

  updateListingPrice(value: number): void {
    const tab = this.rightTab();
    const platform = (tab === 'general' || tab === 'seo' || tab === 'ai' || tab === 'history')
      ? this._draftListings[0]?.platform
      : tab as MarketplacePlatformType;
    if (!platform) return;
    const idx = this._draftListings.findIndex(l => l.platform === platform);
    if (idx < 0) return;
    const listing = { ...this._draftListings[idx] };
    listing.pricing = { ...listing.pricing, sellingPrice: value };
    this._draftListings = [
      ...this._draftListings.slice(0, idx),
      listing,
      ...this._draftListings.slice(idx + 1),
    ];
    this.draftListings.set(this._draftListings);
    this.markDirty();
  }

  updateListingStock(value: number): void {
    const tab = this.rightTab();
    const platform = (tab === 'general' || tab === 'seo' || tab === 'ai' || tab === 'history')
      ? this._draftListings[0]?.platform
      : tab as MarketplacePlatformType;
    if (!platform) return;
    const idx = this._draftListings.findIndex(l => l.platform === platform);
    if (idx < 0) return;
    const listing = { ...this._draftListings[idx] };
    listing.inventory = { ...listing.inventory, totalStock: value };
    this._draftListings = [
      ...this._draftListings.slice(0, idx),
      listing,
      ...this._draftListings.slice(idx + 1),
    ];
    this.draftListings.set(this._draftListings);
    this.markDirty();
  }

  getListingForPlatform(platform: MarketplacePlatformType | null): MarketplaceListing | null {
    if (!platform) return null;
    return this._draftListings.find(l => l.platform === platform) ?? null;
  }

  // --- Image management ---

  async addImage(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || !this._draftProduct) return;
    const url = URL.createObjectURL(file);
    const images = [...this._draftProduct.images];
    const newImg: MarketplaceImage = {
      url,
      altText: this._draftProduct.name,
      order: images.length,
      type: 'gallery',
      isPrimary: images.length === 0,
      createdAt: new Date(),
    };
    this._draftProduct = { ...this._draftProduct, images: [...images, newImg] };
    this.draftProduct.set(this._draftProduct);
    input.value = '';
    this.markDirty();
  }

  setPrimaryImage(index: number): void {
    if (!this._draftProduct) return;
    const images = this._draftProduct.images.map((img, i) => ({ ...img, isPrimary: i === index }));
    this._draftProduct = { ...this._draftProduct, images };
    this.draftProduct.set(this._draftProduct);
    this.markDirty();
  }

  removeImage(index: number): void {
    if (!this._draftProduct) return;
    const images = this._draftProduct.images.filter((_, i) => i !== index).map((img, i) => ({
      ...img, order: i, isPrimary: img.isPrimary && i === 0 ? true : i === 0 && !this._draftProduct!.images[index]?.isPrimary ? img.isPrimary : img.isPrimary,
    }));
    this._draftProduct = { ...this._draftProduct, images };
    this.draftProduct.set(this._draftProduct);
    this.markDirty();
  }

  // --- Vision Analysis ---

  async analyzeVision(): Promise<void> {
    const url = this.primaryImageUrl();
    if (!url) return;
    this.analyzing.set(true);
    try {
      const result = await this.visionSvc.analyzeImages([url]).toPromise();
      if (result) {
        this.visionResult.set(result);
        if (result.fabric) this.setAttr('fabric', result.fabric);
        if (result.sleeve) this.setAttr('sleeve', result.sleeve);
        if (result.fit) this.setAttr('fit', result.fit);
        if (result.neck) this.setAttr('neck', result.neck);
        if (result.occasion) this.setAttr('occasion', result.occasion);
        if (result.colour) this.setAttr('colour', result.colour);
        if (result.category) this.updateProduct('category', result.category);
      }
    } catch (e) {
      if (isDevMode()) console.error('Vision analysis failed', e);
    } finally {
      this.analyzing.set(false);
    }
  }

  // --- AI Generation ---

  async generateAi(): Promise<void> {
    const p = this._draftProduct;
    if (!p) return;
    this.generating.set(true);
    try {
      const listing = this._draftListings[0];
      const input: ListingInput = {
        name: p.name,
        brand: p.brand || '',
        category: p.category || '',
        description: p.description,
        platform: listing?.platform || 'flipkart',
        targetPrice: listing?.pricing?.sellingPrice || 0,
        targetStock: listing?.inventory?.totalStock || 0,
      };
      const content = await this.aiTestingSvc.generateEverything(input).toPromise();
      if (content) {
        this.aiTestingSvc.saveVersion(content, input);
        this.aiVersions.set(this.aiTestingSvc.versions());
        if (content.title) this.updateProduct('name', content.title);
        if (content.description) this.updateProduct('description', content.description);
        if (content.highlights?.length) {
          this._draftProduct = { ...this._draftProduct!, highlights: content.highlights };
          this.draftProduct.set(this._draftProduct);
        }
        if (content.fabric) this.setAttr('fabric', content.fabric);
        if (content.fit) this.setAttr('fit', content.fit);
        if (content.sleeve) this.setAttr('sleeve', content.sleeve);
        if (content.pattern) this.setAttr('pattern', content.pattern);
        if (content.neck) this.setAttr('neck', content.neck);
        if (content.occasion) this.setAttr('occasion', content.occasion);
        if (content.seoKeywords?.length) {
          this.updateSeo('focusKeyword', content.seoKeywords.join(', '));
        }
      }
    } catch (e) {
      if (isDevMode()) console.error('AI generation failed', e);
    } finally {
      this.generating.set(false);
    }
  }

  async regenerate(): Promise<void> {
    await this.generateAi();
  }

  applyAiVersion(content: GeneratedContent): void {
    if (!this._draftProduct) return;
    if (content.title) this.updateProduct('name', content.title);
    if (content.description) this.updateProduct('description', content.description);
    if (content.highlights?.length) {
      this._draftProduct = { ...this._draftProduct, highlights: content.highlights };
      this.draftProduct.set(this._draftProduct);
    }
    if (content.fabric) this.setAttr('fabric', content.fabric);
    if (content.fit) this.setAttr('fit', content.fit);
    if (content.sleeve) this.setAttr('sleeve', content.sleeve);
    if (content.pattern) this.setAttr('pattern', content.pattern);
    if (content.neck) this.setAttr('neck', content.neck);
    if (content.occasion) this.setAttr('occasion', content.occasion);
    if (content.seoKeywords?.length) {
      this.updateSeo('focusKeyword', content.seoKeywords.join(', '));
    }
  }

  // --- Publish / Sync ---

  async publish(): Promise<void> {
    const p = this.product();
    if (!p?.id) return;
    this.publishing.set(true);
    try {
      await this.save();
      const listings = this._draftListings.filter(l => l.publishStatus !== 'published');
      if (listings.length) {
        await this.listingSvc.bulkPublish(listings.map(l => l.id!));
      }
    } finally {
      this.publishing.set(false);
    }
  }

  async sync(): Promise<void> {
    const p = this.product();
    if (!p?.id) return;
    this.syncing.set(true);
    try {
      await this.save();
      await this.syncEngine.syncOne(p.id);
      const syncs = await this.loadSyncHistory(p.id);
      this.syncHistory.set(syncs);
    } finally {
      this.syncing.set(false);
    }
  }

  preview(): void {
    const listing = this._draftListings[0];
    if (listing?.listingUrl) {
      window.open(listing.listingUrl, '_blank');
    }
  }

  // --- Autosave ---

  private markDirty(): void {
    this.dirty.set(true);
    clearTimeout(this._autosaveTimer);
    this._autosaveTimer = setTimeout(() => this.autosave(), 3000);
  }

  private async autosave(): Promise<void> {
    if (!this.dirty() || this.saving()) return;
    await this.save();
  }

  async save(): Promise<void> {
    const p = this._draftProduct;
    if (!p?.id) return;
    this.saving.set(true);
    try {
      const version = p.version + 1;
      const data = { ...p, version, updatedAt: new Date() };
      await this.productSvc.update(p.id, data as any);

      for (const listing of this._draftListings) {
        if (listing.id) {
          await this.listingSvc.update(listing.id, { ...listing, version: (listing.version || 1) + 1 } as any);
        }
      }

      this._draftProduct = JSON.parse(JSON.stringify(data));
      this.draftProduct.set(this._draftProduct);
      this.product.set(JSON.parse(JSON.stringify(data)));
      this.dirty.set(false);
      this.lastSaved.set(new Date());
    } finally {
      this.saving.set(false);
    }
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
      active: 'bg-success bg-opacity-10 text-success', inactive: 'bg-secondary bg-opacity-10 text-secondary',
      draft: 'bg-warning bg-opacity-10 text-warning', pending: 'bg-info bg-opacity-10 text-info',
      rejected: 'bg-danger bg-opacity-10 text-danger', blocked: 'bg-dark bg-opacity-10 text-dark',
    };
    return map[status] || 'bg-secondary bg-opacity-10 text-secondary';
  }

  aiStatusBadge(status: string): string {
    const map: Record<string, string> = {
      completed: 'bg-success bg-opacity-10 text-success', pending: 'bg-info bg-opacity-10 text-info',
      processing: 'bg-warning bg-opacity-10 text-warning', failed: 'bg-danger bg-opacity-10 text-danger',
      not_applicable: 'bg-secondary bg-opacity-10 text-secondary',
    };
    return map[status] || 'bg-secondary bg-opacity-10 text-secondary';
  }

  publishStatusBadge(status: string): string {
    const map: Record<string, string> = {
      published: 'bg-success bg-opacity-10 text-success', pending_review: 'bg-warning bg-opacity-10 text-warning',
      draft: 'bg-secondary bg-opacity-10 text-secondary', unpublished: 'bg-dark bg-opacity-10 text-dark',
      suspended: 'bg-danger bg-opacity-10 text-danger',
    };
    return map[status] || 'bg-secondary bg-opacity-10 text-secondary';
  }

  stockStatusBadge(status: string): string {
    const map: Record<string, string> = {
      in_stock: 'bg-success bg-opacity-10 text-success', out_of_stock: 'bg-danger bg-opacity-10 text-danger',
      low_stock: 'bg-warning bg-opacity-10 text-warning', backorder: 'bg-info bg-opacity-10 text-info',
      discontinued: 'bg-dark bg-opacity-10 text-dark',
    };
    return map[status] || 'bg-secondary bg-opacity-10 text-secondary';
  }

  syncStatusBadge(status: string): string {
    const map: Record<string, string> = {
      completed: 'bg-success bg-opacity-10 text-success', in_progress: 'bg-info bg-opacity-10 text-info',
      pending: 'bg-warning bg-opacity-10 text-warning', failed: 'bg-danger bg-opacity-10 text-danger',
      cancelled: 'bg-secondary bg-opacity-10 text-secondary',
    };
    return map[status] || 'bg-secondary bg-opacity-10 text-secondary';
  }

  logTypeBadge(type: string): string {
    const map: Record<string, string> = {
      success: 'bg-success bg-opacity-10 text-success', info: 'bg-info bg-opacity-10 text-info',
      warning: 'bg-warning bg-opacity-10 text-warning', error: 'bg-danger bg-opacity-10 text-danger',
      sync: 'bg-primary bg-opacity-10 text-primary', publish: 'bg-success bg-opacity-10 text-success',
    };
    return map[type] || 'bg-secondary bg-opacity-10 text-secondary';
  }
}
