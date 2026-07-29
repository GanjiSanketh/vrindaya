import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, firstValueFrom, catchError, throwError, shareReplay, of, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Product } from '../models/product.model';
import { HttpCacheService } from './http-cache.service';
import {
  ApiPagedProducts, ApiProductDetail, apiSummaryToProduct, apiDetailToProduct,
} from '../models/product-api.model';

export interface ProductPage {
  items: Product[];
  nextCursor: string | null;
}

export type PublicSortField = 'displayOrder' | 'createdAt' | 'price' | 'name';

export interface PublicSortOption {
  label: string;
  sortBy: PublicSortField;
  sortDescending: boolean;
}

export const PUBLIC_SORT_OPTIONS: Record<string, PublicSortOption> = {
  displayOrder: { label: 'Display Order',     sortBy: 'displayOrder', sortDescending: false },
  newest:       { label: 'Newest',             sortBy: 'createdAt',    sortDescending: true },
  priceAsc:     { label: 'Price: Low to High', sortBy: 'price',        sortDescending: false },
  priceDesc:    { label: 'Price: High to Low', sortBy: 'price',        sortDescending: true },
  name:         { label: 'Name: A-Z',          sortBy: 'name',         sortDescending: false },
};

export interface PublicProductFilter {
  category?: string;
  featured?: boolean;
  newArrival?: boolean;
  bestSeller?: boolean;
  minPrice?: number;
  maxPrice?: number;
  inStockOnly?: boolean;
}

const BASE = `${environment.apiBaseUrl}/products`;
const LISTING_TTL_MS = 120_000;
const FRIENDLY_ERROR = 'Could not load products right now. Please try again.';

export class ProductNotFoundError extends Error {
  constructor(id: string) {
    super(`Product "${id}" not found.`);
  }
}

@Injectable({ providedIn: 'root' })
export class ProductQueryService {
  private readonly http  = inject(HttpClient);
  private readonly cache = inject(HttpCacheService);

  /**
   * Session-scoped product detail cache — once fetched, NEVER re-fetched.
   * Cleared only when the tab closes.
   */
  private readonly productDetailCache = new Map<string, Product>();
  /** Tracks in-flight detail requests to prevent concurrent duplicate fetches. */
  private readonly inFlightDetails = new Map<string, Observable<Product>>();

  private selectFields = 'id,name,slug,sku,price,originalPrice,discount,rating,reviewCount,category,image,bannerImage,gallery,shortDescription,description,brand,tags,isOutOfStock,isActive,isNewArrival,isFeatured,isBestSeller,variantCount,totalStock,flipkartProductUrl,createdAt,updatedAt';

  getFeatured(pageSize = 12, cursor?: string): Promise<ProductPage> {
    return this.fetchPage(BASE, { featured: 'true', pageSize: String(pageSize), fields: this.selectFields, ...(cursor ? { cursor } : {}) });
  }

  getNewArrivals(pageSize = 12, cursor?: string): Promise<ProductPage> {
    return this.fetchPage(BASE, {
      newArrival: 'true', sortBy: 'createdAt', sortDescending: 'true',
      pageSize: String(pageSize), fields: this.selectFields,
      ...(cursor ? { cursor } : {}),
    });
  }

  getBestSellers(pageSize = 12, cursor?: string): Promise<ProductPage> {
    return this.fetchPage(BASE, { bestSeller: 'true', pageSize: String(pageSize), fields: this.selectFields, ...(cursor ? { cursor } : {}) });
  }

  getByCategory(
    categoryId: string, pageSize = 24, cursor?: string,
    sortBy?: string, sortDescending?: boolean,
  ): Promise<ProductPage> {
    const params: Record<string, string> = { category: categoryId, pageSize: String(pageSize), fields: this.selectFields };
    if (cursor)         params['cursor'] = cursor;
    if (sortBy)         params['sortBy'] = sortBy;
    if (sortDescending) params['sortDescending'] = 'true';
    return this.fetchPage(BASE, params);
  }

  async getRelated(categoryId: string, excludeId: string, limit = 4): Promise<Product[]> {
    const page = await this.getByCategory(categoryId, limit + 1);
    return page.items.filter(p => p.id !== excludeId && p.variantCount > 0 && p.totalStock > 0).slice(0, limit);
  }

  browse(
    filter: PublicProductFilter, sortBy: PublicSortField, sortDescending: boolean,
    pageSize = 24, cursor?: string,
  ): Promise<ProductPage> {
    const params: Record<string, string> = {
      pageSize: String(pageSize), fields: this.selectFields,
      sortBy,
      ...(sortDescending ? { sortDescending: 'true' } : {}),
      ...(cursor ? { cursor } : {}),
      ...(filter.category ? { category: filter.category } : {}),
      ...(filter.featured !== undefined ? { featured: String(filter.featured) } : {}),
      ...(filter.newArrival !== undefined ? { newArrival: String(filter.newArrival) } : {}),
      ...(filter.bestSeller !== undefined ? { bestSeller: String(filter.bestSeller) } : {}),
      ...(filter.minPrice !== undefined ? { minPrice: String(filter.minPrice) } : {}),
      ...(filter.maxPrice !== undefined ? { maxPrice: String(filter.maxPrice) } : {}),
      ...(filter.inStockOnly ? { inStockOnly: 'true' } : {}),
    };
    return this.fetchPage(BASE, params);
  }

  search(query: string, pageSize = 8, cursor?: string): Promise<ProductPage> {
    const params: Record<string, string> = { q: query, pageSize: String(pageSize), fields: this.selectFields };
    if (cursor) params['cursor'] = cursor;
    return this.fetchPage(`${BASE}/search`, params);
  }

  /**
   * Returns cached product detail immediately if already fetched.
   * Otherwise fetches from API once and caches permanently (session-scoped).
   * Subsequent calls for the same id resolve instantly with no network request.
   */
  async getById(id: string): Promise<Product> {
    const cached = this.productDetailCache.get(id);
    if (cached) return cached;

    const existing = this.inFlightDetails.get(id);
    if (existing) return firstValueFrom(existing);

    const obs = this.createDetailObservable(id);

    try {
      const product = await firstValueFrom(obs);
      if (product.variantCount === 0 || product.totalStock === 0) {
        throw new ProductNotFoundError(id);
      }
      this.productDetailCache.set(id, product);
      return product;
    } finally {
      this.inFlightDetails.delete(id);
    }
  }

  /** Observable variant — same caching behavior but returns Observable for RxJS composition (switchMap, etc.). */
  getById$(id: string): Observable<Product> {
    const cached = this.productDetailCache.get(id);
    if (cached) return of(cached);

    const existing = this.inFlightDetails.get(id);
    if (existing) return existing;

    const obs = this.createDetailObservable(id);
    return obs;
  }

  private createDetailObservable(id: string): Observable<Product> {
    const url = `${BASE}/${id}?fields=${this.selectFields}`;
    const obs = this.http.get<ApiProductDetail>(url).pipe(
      map(dto => {
        const product = apiDetailToProduct(dto);
        this.productDetailCache.set(id, product);
        return product;
      }),
      shareReplay({ bufferSize: 1, refCount: true }),
      catchError((err: unknown) => {
        this.inFlightDetails.delete(id);
        if (err instanceof HttpErrorResponse && err.status === 404) {
          return throwError(() => new ProductNotFoundError(id));
        }
        return throwError(() => new Error(FRIENDLY_ERROR));
      }),
    );
    this.inFlightDetails.set(id, obs);
    return obs;
  }

  /** Returns product detail directly if cached (synchronous, no network). */
  getCachedProduct(id: string): Product | undefined {
    return this.productDetailCache.get(id);
  }

  private async fetchPage(url: string, params: Record<string, string>): Promise<ProductPage> {
    const key = `${url}?${new URLSearchParams(params).toString()}`;
    const page = await firstValueFrom(
      this.cache.get(key, () => this.http.get<ApiPagedProducts>(url, { params }).pipe(this.mapError()), LISTING_TTL_MS),
    );
    const items = page.items
      .map(apiSummaryToProduct)
      .filter(p => p.variantCount > 0 && p.totalStock > 0);
    return { items, nextCursor: page.nextCursor };
  }

  private mapError<T>() {
    return catchError<T, Observable<never>>(() => throwError(() => new Error(FRIENDLY_ERROR)));
  }
}
