import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, firstValueFrom, catchError, throwError } from 'rxjs';
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

/** The storefront's 5 required sort options (Shop page + category listing) — one shared map so both stay in sync. */
export const PUBLIC_SORT_OPTIONS: Record<string, PublicSortOption> = {
  displayOrder: { label: 'Display Order',     sortBy: 'displayOrder', sortDescending: false },
  newest:       { label: 'Newest',             sortBy: 'createdAt',    sortDescending: true },
  priceAsc:     { label: 'Price: Low to High', sortBy: 'price',        sortDescending: false },
  priceDesc:    { label: 'Price: High to Low', sortBy: 'price',        sortDescending: true },
  name:         { label: 'Name: A-Z',          sortBy: 'name',         sortDescending: false },
};

/** The Shop page's filter chips — mutually exclusive (mirrors ProductQuery's backend doc comment): set at most one at a time. */
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
const LISTING_TTL_MS = 60_000;
const DETAIL_TTL_MS = 60_000;
const FRIENDLY_ERROR = 'Could not load products right now. Please try again.';

/** Thrown by getById when the product doesn't exist (or is inactive/deleted and the caller isn't an admin) — distinguished from network/Firestore failures so the Product Details page can show "not found" instead of a retry-able error. */
export class ProductNotFoundError extends Error {
  constructor(id: string) {
    super(`Product "${id}" not found.`);
  }
}

/**
 * The public, read-only HTTP client for the storefront — Featured Products,
 * New Arrivals, Category listing, Related Products, Search, and Product
 * Details all funnel through here. Every method is cached (HttpCacheService)
 * and retried transparently (retryInterceptor, registered in app.config.ts)
 * — callers only need to handle the final resolved/rejected promise.
 */
@Injectable({ providedIn: 'root' })
export class ProductQueryService {
  private readonly http  = inject(HttpClient);
  private readonly cache = inject(HttpCacheService);

  getFeatured(pageSize = 12, cursor?: string): Promise<ProductPage> {
    return this.fetchPage(BASE, { featured: 'true', pageSize: String(pageSize), ...(cursor ? { cursor } : {}) });
  }

  getNewArrivals(pageSize = 12, cursor?: string): Promise<ProductPage> {
    return this.fetchPage(BASE, {
      newArrival: 'true', sortBy: 'createdAt', sortDescending: 'true',
      pageSize: String(pageSize), ...(cursor ? { cursor } : {}),
    });
  }

  getBestSellers(pageSize = 12, cursor?: string): Promise<ProductPage> {
    return this.fetchPage(BASE, { bestSeller: 'true', pageSize: String(pageSize), ...(cursor ? { cursor } : {}) });
  }

  getByCategory(
    categoryId: string, pageSize = 24, cursor?: string,
    sortBy?: string, sortDescending?: boolean,
  ): Promise<ProductPage> {
    const params: Record<string, string> = { category: categoryId, pageSize: String(pageSize) };
    if (cursor)         params['cursor'] = cursor;
    if (sortBy)         params['sortBy'] = sortBy;
    if (sortDescending) params['sortDescending'] = 'true';
    return this.fetchPage(BASE, params);
  }

  /** Same-category products, excluding the current one — reuses the category listing query, no dedicated backend endpoint needed. */
  async getRelated(categoryId: string, excludeId: string, limit = 4): Promise<Product[]> {
    const page = await this.getByCategory(categoryId, limit + 1);
    return page.items.filter(p => p.id !== excludeId).slice(0, limit);
  }

  /** The Shop/browse page — one filter chip (or none) + one of the 5 storefront sort options, server-side paginated. */
  browse(
    filter: PublicProductFilter, sortBy: PublicSortField, sortDescending: boolean,
    pageSize = 24, cursor?: string,
  ): Promise<ProductPage> {
    const params: Record<string, string> = {
      pageSize: String(pageSize),
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
    const params: Record<string, string> = { q: query, pageSize: String(pageSize) };
    if (cursor) params['cursor'] = cursor;
    return this.fetchPage(`${BASE}/search`, params);
  }

  /** The "Product Details API" — full record (sizes, full gallery, description, tags). Throws ProductNotFoundError on a 404, distinct from network/Firestore failures. */
  async getById(id: string): Promise<Product> {
    const url = `${BASE}/${id}`;
    const dto = await firstValueFrom(
      this.cache.get(url, () => this.http.get<ApiProductDetail>(url).pipe(
        catchError((err: unknown) => {
          if (err instanceof HttpErrorResponse && err.status === 404) {
            return throwError(() => new ProductNotFoundError(id));
          }
          return throwError(() => new Error(FRIENDLY_ERROR));
        }),
      ), DETAIL_TTL_MS),
    );
    return apiDetailToProduct(dto);
  }

  private async fetchPage(url: string, params: Record<string, string>): Promise<ProductPage> {
    const key = `${url}?${new URLSearchParams(params).toString()}`;
    const page = await firstValueFrom(
      this.cache.get(key, () => this.http.get<ApiPagedProducts>(url, { params }).pipe(this.mapError()), LISTING_TTL_MS),
    );
    return { items: page.items.map(apiSummaryToProduct), nextCursor: page.nextCursor };
  }

  private mapError<T>() {
    return catchError<T, Observable<never>>(() => throwError(() => new Error(FRIENDLY_ERROR)));
  }
}
