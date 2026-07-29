import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpEventType } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Product } from '../models/product.model';
import {
  ApiPagedProducts, ApiProductDetail, AdminProductInput, FlipkartOpsInput,
  AdminProductListQuery, ProductFlagName, DashboardDto,
  SaleDto, CreateSaleRequest,
  apiSummaryToProduct, apiDetailToProduct,
} from '../models/product-api.model';
import { LifecycleStageValue } from '../constants/lifecycle-stage.constants';

export interface PricingDashboardResponse {
  summary: PricingSummary;
  topProfitable: ProductPricingDto[];
  leastProfitable: ProductPricingDto[];
  sellingAtLoss: ProductPricingDto[];
  allProducts: ProductPricingDto[];
}
export interface PricingSummary {
  totalProducts: number;
  profitableCount: number;
  lossCount: number;
  averageProfitPercent: number;
  totalProfit: number;
}
export interface ProductPricingDto {
  productId: string;
  productName: string;
  productImage: string | null;
  sellingPrice: number;
  mrp: number | null;
  costPrice: number | null;
  packagingCost: number;
  shippingCost: number;
  commissionPercent: number;
  commissionAmount: number;
  gstPercent: number;
  gstAmount: number;
  totalCost: number;
  profit: number;
  profitPercent: number;
  marginPercent: number;
  recommendedSellingPrice: number;
  minimumSellingPrice: number;
  isLoss: boolean;
}

export interface InventoryProductResponse {
  productId: string;
  productName: string;
  productImage: string | null;
  variants: InventoryVariantResponse[];
}
export interface InventoryVariantResponse {
  variantId: string;
  colourName: string;
  colourHex: string | null;
  sizes: InventorySizeResponse[];
}
export interface InventorySizeResponse {
  size: string;
  stock: number;
}
export interface StockUpdateItem {
  productId: string;
  variantId: string;
  sizes: { size: string; stock: number }[];
}

export interface PagedProductListResult {
  items: Product[];
  nextCursor: string | null;
  totalCount: number;
}

const BASE = `${environment.apiBaseUrl}/products`;
const INVENTORY_BASE = `${environment.apiBaseUrl}/inventory`;

/**
 * Admin-only, HttpClient-based product CRUD — everything that used to go
 * straight to Firestore/Storage from Angular now goes through the API (the
 * Firebase ID token is attached by authTokenInterceptor). The public
 * storefront also went fully API-driven in Phase 4 (see ProductQueryService)
 * — this service remains the admin-only surface, consumed only by admin
 * components.
 *
 * Two, deliberately separate data strategies live here:
 * - `queryPaged()` — the admin PRODUCT LIST's server-side paginated/
 *   filtered/sorted query (Phase 13). Every call is a fresh, independent
 *   request; nothing is cached client-side, so the list never downloads
 *   more than one page's worth of products.
 * - `ensureLoaded()`/`refresh()`/`products` — a full-catalog client cache
 *   used ONLY by the product FORM's instant slug/sku uniqueness pre-check
 *   (existsBySlug/existsBySku), a much smaller, pre-existing concern this
 *   phase deliberately left alone. Do not use `products()` for list
 *   rendering — that's exactly the "download the whole collection" pattern
 *   the list was rebuilt to avoid.
 */
@Injectable({ providedIn: 'root' })
export class ProductApiService {
  private readonly http = inject(HttpClient);

  readonly products = signal<Product[]>([]);
  readonly loading = signal(false);
  private loaded = false;

  async ensureLoaded(): Promise<void> {
    if (this.loaded) return;
    await this.refresh();
  }

  /** Called on admin sign-out so a subsequent session never shows this session's cached catalog before its own first fetch. */
  clearCache(): void {
    this.products.set([]);
    this.loaded = false;
  }

  async refresh(): Promise<void> {
    this.loading.set(true);
    try {
      this.products.set(await this.fetchAllPages());
      this.loaded = true;
    } finally {
      this.loading.set(false);
    }
  }

  private async fetchAllPages(): Promise<Product[]> {
    const results: Product[] = [];
    let cursor: string | null = null;

    do {
      const params: Record<string, string> = { pageSize: '100' };
      if (cursor) params['cursor'] = cursor;

      const page = await firstValueFrom(this.http.get<ApiPagedProducts>(BASE, { params }));
      results.push(...page.items.map(apiSummaryToProduct));
      cursor = page.nextCursor;
    } while (cursor);

    return results;
  }

  /**
   * Server-side paginated/filtered/sorted admin product list — deliberately
   * independent of `products`/ensureLoaded()'s full-catalog cache (used only
   * by the product form's slug/sku pre-check). Every call is a fresh
   * request; nothing here is cached client-side, per the admin list's
   * "don't download the whole collection" requirement.
   */
  async queryPaged(query: AdminProductListQuery): Promise<PagedProductListResult> {
    const params: Record<string, string> = {
      deleted: String(query.deleted),
      // Always false here: BuildAdminFilters (selected by the `deleted`
      // param above) doesn't use ActiveOnly at all, but leaving the
      // property at its server-side default (true) on the request DTO
      // would be misleading — activeStatus below is the admin equivalent.
      activeOnly: 'false',
      pageSize: String(query.pageSize),
    };
    if (query.cursor)                     params['cursor'] = query.cursor;
    if (query.sortBy)                     params['sortBy'] = query.sortBy;
    if (query.sortDescending)             params['sortDescending'] = 'true';
    if (query.category)                   params['category'] = query.category;
    if (query.activeStatus !== undefined) params['activeStatus'] = String(query.activeStatus);
    if (query.featured !== undefined)     params['featured'] = String(query.featured);
    if (query.newArrival !== undefined)   params['newArrival'] = String(query.newArrival);
    if (query.bestSeller !== undefined)   params['bestSeller'] = String(query.bestSeller);
    if (query.search)                     params['search'] = query.search;
    if (query.minPrice !== undefined)     params['minPrice'] = String(query.minPrice);
    if (query.maxPrice !== undefined)     params['maxPrice'] = String(query.maxPrice);

    const page = await firstValueFrom(this.http.get<ApiPagedProducts>(BASE, { params }));
    return {
      items: page.items.map(apiSummaryToProduct),
      nextCursor: page.nextCursor,
      totalCount: page.totalCount,
    };
  }

  async generateId(): Promise<string> {
    const res = await firstValueFrom(this.http.post<{ id: string }>(`${BASE}/ids`, {}));
    return res.id;
  }

  async getById(id: string): Promise<Product | null> {
    try {
      const dto = await firstValueFrom(this.http.get<ApiProductDetail>(`${BASE}/${id}`));
      return apiDetailToProduct(dto);
    } catch {
      return null;
    }
  }

  async create(input: AdminProductInput): Promise<Product> {
    const dto = await firstValueFrom(this.http.post<ApiProductDetail>(BASE, input));
    const product = apiDetailToProduct(dto);
    this.products.update(list => [product, ...list]);
    return product;
  }

  async update(id: string, input: AdminProductInput): Promise<Product> {
    const dto = await firstValueFrom(this.http.put<ApiProductDetail>(`${BASE}/${id}`, input));
    const product = apiDetailToProduct(dto);
    this.products.update(list => list.map(p => p.id === id ? product : p));
    return product;
  }

  /** Permanently deletes the product, all variants, and all Cloudinary images. Returns the response so the caller can show a success message. */
  async delete(id: string): Promise<{ success: boolean; message: string }> {
    const res = await firstValueFrom(this.http.delete<{ success: boolean; message: string }>(`${BASE}/${id}`));
    this.products.update(list => list.filter(p => p.id !== id));
    return res;
  }

  async restore(id: string): Promise<void> {
    await firstValueFrom(this.http.post<void>(`${BASE}/${id}/restore`, {}));
    this.patchLocal(id, { deleted: false });
  }

  async bulkStatus(ids: string[], active: boolean): Promise<void> {
    await firstValueFrom(this.http.patch<void>(`${BASE}/bulk-status`, { ids, active }));
    ids.forEach(id => this.patchLocal(id, { active }));
  }

  async bulkRestore(ids: string[]): Promise<void> {
    await firstValueFrom(this.http.post<void>(`${BASE}/bulk-restore`, { ids }));
    ids.forEach(id => this.patchLocal(id, { deleted: false }));
  }

  /** Bulk mark/remove one Featured/NewArrival/BestSeller flag across every given id in one request. */
  async bulkFlag(ids: string[], flag: ProductFlagName, value: boolean): Promise<void> {
    await firstValueFrom(this.http.patch<void>(`${BASE}/bulk-flag`, { ids, flag, value }));
    const field = flag.charAt(0).toLowerCase() + flag.slice(1);
    ids.forEach(id => this.patchLocal(id, { [field]: value } as Partial<Product>));
  }

  /** Bulk soft delete — the bulk counterpart of softDelete(), fully restorable via bulkRestore. */
  async bulkSoftDelete(ids: string[]): Promise<void> {
    await firstValueFrom(this.http.post<void>(`${BASE}/bulk-delete`, { ids }));
    ids.forEach(id => this.patchLocal(id, { deleted: true, active: false }));
  }

  /** Irreversible — deletes the Firestore document and every Storage image it references. Only meant to be called on an already-soft-deleted product from the admin's "Deleted" tab. */
  async permanentlyDelete(id: string): Promise<void> {
    await firstValueFrom(this.http.delete<void>(`${BASE}/${id}/permanent`));
    this.products.update(list => list.filter(p => p.id !== id));
  }

  /** Server-side duplicate — copies every field except CreatedAt/UpdatedAt/Slug/Sku (suffixed to stay unique), including a server-side Storage copy of every image into the new product's own folder. */
  async duplicate(id: string): Promise<Product | null> {
    try {
      const dto = await firstValueFrom(this.http.post<ApiProductDetail>(`${BASE}/${id}/duplicate`, {}));
      const product = apiDetailToProduct(dto);
      this.products.update(list => [product, ...list]);
      return product;
    } catch {
      return null;
    }
  }

  /** Zero network calls — computed against the already-fetched catalog (products() must be loaded first via ensureLoaded()). */
  existsBySlug(slug: string, excludeId?: string): boolean {
    return this.products().some(p => p.slug === slug && p.id !== excludeId);
  }

  existsBySku(sku: string, excludeId?: string): boolean {
    return this.products().some(p => p.sku === sku && p.id !== excludeId);
  }

  /* ── Flipkart Operations (Phase 7) ── */

  async updateFlipkartOps(id: string, input: FlipkartOpsInput): Promise<void> {
    await firstValueFrom(this.http.patch<void>(`${BASE}/${id}/flipkart-ops`, input));
    this.patchLocal(id, {
      flipkartProductUrl: input.flipkartProductUrl,
      flipkartProductId: input.flipkartProductId,
      flipkartSellerSku: input.flipkartSellerSku,
      flipkartFsn: input.flipkartFsn,
      launchDate: input.launchDate ?? null,
      lastSyncDate: input.lastSyncDate ?? null,
      marketplacePrice: input.marketplacePrice,
      marketplaceMrp: input.marketplaceMrp,
      marketplaceDiscount: input.marketplaceDiscount,
      marketplaceCategory: input.marketplaceCategory,
      marketplaceTags: input.marketplaceTags,
      flipkartUrl: input.flipkartProductUrl ?? '',
    });
  }

  async bulkUpdateFlipkartUrls(items: { id: string; flipkartProductUrl?: string; flipkartSellerSku?: string }[]): Promise<void> {
    await firstValueFrom(this.http.patch<void>(`${BASE}/bulk-flipkart-urls`, { items }));
    items.forEach(it => this.patchLocal(it.id, {
      flipkartProductUrl: it.flipkartProductUrl,
      flipkartSellerSku: it.flipkartSellerSku,
      flipkartUrl: it.flipkartProductUrl ?? '',
    }));
  }

  async bulkLaunch(ids: string[], launchDate?: string): Promise<void> {
    await firstValueFrom(this.http.post<void>(`${BASE}/bulk-launch`, { ids, launchDate }));
    const iso = launchDate ?? new Date().toISOString();
    ids.forEach(id => this.patchLocal(id, { lifecycleStage: 'Listed On Flipkart', launchDate: iso }));
  }

  /* ── Product Lifecycle (Phase 8) ── */

  async updateLifecycleStage(id: string, stage: LifecycleStageValue): Promise<void> {
    await firstValueFrom(this.http.patch<void>(`${INVENTORY_BASE}/${id}/lifecycle`, { stage }));
    this.patchLocal(id, { lifecycleStage: stage });
  }

  async bulkUpdateLifecycleStage(ids: string[], stage: LifecycleStageValue): Promise<void> {
    await firstValueFrom(this.http.patch<void>(`${INVENTORY_BASE}/bulk-lifecycle`, { ids, stage }));
    ids.forEach(id => this.patchLocal(id, { lifecycleStage: stage }));
  }

  /** One-click convenience — same endpoint as bulkUpdateLifecycleStage with the "Archived" preset. */
  async bulkArchive(ids: string[]): Promise<void> {
    return this.bulkUpdateLifecycleStage(ids, 'Archived');
  }

  /* ── Pricing Dashboard ── */

  getPricingDashboard() {
    return this.http.get<PricingDashboardResponse>(`${environment.apiBaseUrl}/pricing/dashboard`);
  }

  /* ── Admin Dashboard ── */

  getDashboard() {
    return this.http.get<DashboardDto>(`${environment.apiBaseUrl}/dashboard`);
  }

  /* ── Sales Management ── */

  getSales() {
    return this.http.get<SaleDto[]>(`${environment.apiBaseUrl}/sales`);
  }

  getSale(id: string) {
    return this.http.get<SaleDto>(`${environment.apiBaseUrl}/sales/${id}`);
  }

  createSale(request: CreateSaleRequest) {
    return this.http.post<SaleDto>(`${environment.apiBaseUrl}/sales`, request);
  }

  updateSale(id: string, request: CreateSaleRequest) {
    return this.http.put<SaleDto>(`${environment.apiBaseUrl}/sales/${id}`, request);
  }

  deleteSale(id: string) {
    return this.http.delete<void>(`${environment.apiBaseUrl}/sales/${id}`);
  }

  /* ── Inventory Management ── */

  getInventory() {
    return this.http.get<InventoryProductResponse[]>(`${INVENTORY_BASE}`);
  }

  updateStock(updates: StockUpdateItem[]) {
    return this.http.patch<void>(`${INVENTORY_BASE}/stock`, { updates });
  }

  /* ── Variant Image Upload ── */

  uploadVariantImage(productId: string, variantId: string, slot: string, file: File) {
    const fd = new FormData();
    fd.append('slot', slot);
    fd.append('file', file);
    return this.http.post<{ url: string; publicId: string }>(
      `${BASE}/${productId}/variants/${variantId}/images`, fd,
    );
  }

  deleteVariantImage(productId: string, variantId: string, publicId: string) {
    return this.http.delete<void>(
      `${BASE}/${productId}/variants/${variantId}/images`,
      { params: { publicId } },
    );
  }

  private patchLocal(id: string, patch: Partial<Product>): void {
    this.products.update(list => list.map(p => p.id === id ? { ...p, ...patch } : p));
  }
}
