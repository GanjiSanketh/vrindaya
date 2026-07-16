import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpEventType } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Product } from '../models/product.model';
import {
  ApiPagedProducts, ApiProductDetail, ApiUploadedImage, AdminProductInput, FlipkartOpsInput,
  ApiInventoryDetail, UpdateInventoryInput, AdminProductListQuery, ProductFlagName,
  apiSummaryToProduct, apiDetailToProduct,
} from '../models/product-api.model';
import { LifecycleStageValue } from '../constants/lifecycle-stage.constants';

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

  async softDelete(id: string): Promise<void> {
    await firstValueFrom(this.http.delete<void>(`${BASE}/${id}`));
    this.patchLocal(id, { deleted: true, active: false });
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

  /**
   * fileName is the position-based name computed by the caller ("cover",
   * "image-2", ...) — see image-processing.util.ts, used as the
   * human-readable base of the generated Cloudinary public id. "Replace
   * image" is a separate explicit delete-then-upload (see
   * AdminProductFormComponent.replaceImage) — Cloudinary never overwrites
   * in place.
   */
  uploadImage(productId: string, file: File | Blob, fileName?: string, onProgress?: (percent: number) => void): Promise<ApiUploadedImage> {
    const formData = new FormData();
    formData.append('productId', productId);
    if (fileName) formData.append('fileName', fileName);
    formData.append('file', file, fileName ? `${fileName}.webp` : undefined);

    return new Promise((resolve, reject) => {
      this.http.post<ApiUploadedImage>(`${BASE}/upload-images`, formData, {
        reportProgress: !!onProgress,
        observe: 'events',
      }).subscribe({
        next: event => {
          if (event.type === HttpEventType.UploadProgress && event.total) {
            onProgress?.(Math.round((event.loaded / event.total) * 100));
          } else if (event.type === HttpEventType.Response) {
            resolve(event.body as ApiUploadedImage);
          }
        },
        error: err => reject(err instanceof Error ? err : new Error('Upload failed.')),
      });
    });
  }

  async deleteImage(productId: string, publicId: string): Promise<void> {
    await firstValueFrom(this.http.delete<void>(`${BASE}/upload-images`, { params: { productId, publicId } }));
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

  /* ── Inventory & Product Lifecycle (Phase 8) ── */

  async getInventory(id: string): Promise<ApiInventoryDetail> {
    return firstValueFrom(this.http.get<ApiInventoryDetail>(`${INVENTORY_BASE}/${id}`));
  }

  async updateInventory(id: string, input: UpdateInventoryInput): Promise<void> {
    const dto = await firstValueFrom(this.http.patch<ApiInventoryDetail>(`${INVENTORY_BASE}/${id}`, input));
    const patch: Partial<Product> = {
      sizes: input.sizes,
      stock: dto.stock,
      lowStockThreshold: dto.lowStockThreshold,
      autoHideWhenOutOfStock: dto.autoHideWhenOutOfStock,
      stockUpdatedAt: dto.stockUpdatedAt ?? null,
      isOutOfStock: dto.isOutOfStock,
      isLowStock: dto.isLowStock,
    };
    // Mirrors the server-side auto-hide automation so the admin list doesn't show stale "Active" state until the next refresh.
    if (dto.isOutOfStock && input.autoHideWhenOutOfStock) {
      patch.active = false;
    }
    this.patchLocal(id, patch);
  }

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

  private patchLocal(id: string, patch: Partial<Product>): void {
    this.products.update(list => list.map(p => p.id === id ? { ...p, ...patch } : p));
  }
}
