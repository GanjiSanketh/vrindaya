import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ProductListing, ProductListingQuery, UpdateProductListingRequest, BulkUpdateListingStatusRequest, MarketplaceDashboard } from '../models/product-listing.model';
import { PagedResult } from '../models/inventory.model';

const URL = `${environment.apiBaseUrl}/product-listings`;

function apiErrorMessage(err: any, fallback: string): string {
  const msg = err?.error?.message ?? err?.message ?? fallback;
  return typeof msg === 'string' ? msg : fallback;
}

@Injectable({ providedIn: 'root' })
export class ProductListingService {
  private readonly http = inject(HttpClient);

  getListings(query: ProductListingQuery): Promise<PagedResult<ProductListing>> {
    let params = new HttpParams().set('pageSize', String(query.pageSize ?? 20));
    if (query.search) params = params.set('search', query.search);
    if (query.marketplace) params = params.set('marketplace', query.marketplace);
    if (query.listingStatus) params = params.set('listingStatus', query.listingStatus);
    if (query.listingQuality) params = params.set('listingQuality', query.listingQuality);
    if (query.syncStatus) params = params.set('syncStatus', query.syncStatus);
    if (query.cursor) params = params.set('cursor', query.cursor);
    return firstValueFrom(
      this.http.get<PagedResult<ProductListing>>(URL, { params }).pipe(
        catchError(err => throwError(() => apiErrorMessage(err, 'Could not load listings.'))),
      ),
    );
  }

  getListing(id: string): Promise<ProductListing> {
    return firstValueFrom(
      this.http.get<ProductListing>(`${URL}/${id}`).pipe(
        catchError(err => throwError(() => apiErrorMessage(err, 'Could not load listing.'))),
      ),
    );
  }

  updateListing(id: string, request: UpdateProductListingRequest): Promise<ProductListing> {
    return firstValueFrom(
      this.http.put<ProductListing>(`${URL}/${id}`, request).pipe(
        catchError(err => throwError(() => apiErrorMessage(err, 'Could not update listing.'))),
      ),
    );
  }

  bulkUpdateStatus(request: BulkUpdateListingStatusRequest): Promise<ProductListing[]> {
    return firstValueFrom(
      this.http.patch<ProductListing[]>(`${URL}/bulk-status`, request).pipe(
        catchError(err => throwError(() => apiErrorMessage(err, 'Could not update listings.'))),
      ),
    );
  }

  getDashboard(): Promise<MarketplaceDashboard> {
    return firstValueFrom(
      this.http.get<MarketplaceDashboard>(`${URL}/dashboard`).pipe(
        catchError(err => throwError(() => apiErrorMessage(err, 'Could not load marketplace dashboard.'))),
      ),
    );
  }
}
