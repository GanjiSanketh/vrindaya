import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { firstValueFrom, catchError, throwError } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { PricingRow, CreatePricingRequest, UpdatePricingRequest, ProductPricingSummaryRow, BulkPricingUpdateRequest, BulkPricingPreviewResponse, PricingDashboardResponse, PricingRecommendationResponse } from '../models/pricing.model';
import { PricingHistoryRow, PricingHistoryQuery } from '../models/pricing-history.model';
import { PagedResult } from '../models/inventory.model';

const URL = `${environment.apiBaseUrl}/pricing`;

function apiErrorMessage(err: unknown, fallback: string): Error {
  if (err instanceof HttpErrorResponse && typeof err.error?.message === 'string') {
    return new Error(err.error.message);
  }
  return new Error(fallback);
}

@Injectable({ providedIn: 'root' })
export class PricingService {
  private readonly http = inject(HttpClient);

  getAll(
    cursor: string | null, pageSize = 50, search?: string,
    marketplace?: string, isActive?: boolean, inventoryVariantId?: string,
    sortBy = 'marketplace', sortDescending = false,
  ): Promise<PagedResult<PricingRow>> {
    let params = new HttpParams().set('pageSize', pageSize).set('sortBy', sortBy).set('sortDescending', sortDescending);
    if (cursor) params = params.set('cursor', cursor);
    if (search) params = params.set('search', search);
    if (marketplace) params = params.set('marketplace', marketplace);
    if (isActive !== undefined) params = params.set('isActive', isActive);
    if (inventoryVariantId) params = params.set('inventoryVariantId', inventoryVariantId);

    return firstValueFrom(
      this.http.get<PagedResult<PricingRow>>(URL, { params }).pipe(
        catchError(err => throwError(() => apiErrorMessage(err, 'Could not load pricing data.'))),
      ),
    );
  }

  getOne(id: string): Promise<PricingRow> {
    return firstValueFrom(
      this.http.get<PricingRow>(`${URL}/${encodeURIComponent(id)}`).pipe(
        catchError(err => throwError(() => apiErrorMessage(err, 'Could not load pricing record.'))),
      ),
    );
  }

  getByVariant(variantId: string): Promise<PricingRow[]> {
    return firstValueFrom(
      this.http.get<PricingRow[]>(`${URL}/variants/${encodeURIComponent(variantId)}`).pipe(
        catchError(err => throwError(() => apiErrorMessage(err, 'Could not load pricing data for variant.'))),
      ),
    );
  }

  create(request: CreatePricingRequest): Promise<PricingRow> {
    return firstValueFrom(
      this.http.post<PricingRow>(URL, request).pipe(
        catchError(err => throwError(() => apiErrorMessage(err, 'Failed to create pricing record.'))),
      ),
    );
  }

  update(id: string, request: UpdatePricingRequest): Promise<PricingRow> {
    return firstValueFrom(
      this.http.put<PricingRow>(`${URL}/${encodeURIComponent(id)}`, request).pipe(
        catchError(err => throwError(() => apiErrorMessage(err, 'Failed to update pricing record.'))),
      ),
    );
  }

  getProductPricing(productId: string): Promise<ProductPricingSummaryRow[]> {
    return firstValueFrom(
      this.http.get<ProductPricingSummaryRow[]>(`${URL}/products/${encodeURIComponent(productId)}`).pipe(
        catchError(err => throwError(() => apiErrorMessage(err, 'Could not load product pricing.'))),
      ),
    );
  }

  bulkPreview(request: BulkPricingUpdateRequest): Promise<BulkPricingPreviewResponse> {
    return firstValueFrom(
      this.http.post<BulkPricingPreviewResponse>(`${URL}/bulk/preview`, request).pipe(
        catchError(err => throwError(() => apiErrorMessage(err, 'Could not compute bulk preview.'))),
      ),
    );
  }

  bulkApply(request: BulkPricingUpdateRequest): Promise<{ applied: number }> {
    return firstValueFrom(
      this.http.post<{ applied: number }>(`${URL}/bulk/apply`, request).pipe(
        catchError(err => throwError(() => apiErrorMessage(err, 'Failed to apply bulk update.'))),
      ),
    );
  }

  recalculate(id: string): Promise<PricingRow> {
    return firstValueFrom(
      this.http.post<PricingRow>(`${URL}/${encodeURIComponent(id)}/recalculate`, {}).pipe(
        catchError(err => throwError(() => apiErrorMessage(err, 'Failed to recalculate pricing.'))),
      ),
    );
  }

  getAllUnpaged(): Promise<PricingRow[]> {
    return firstValueFrom(
      this.http.get<PricingRow[]>(`${URL}/export/all`).pipe(
        catchError(err => throwError(() => apiErrorMessage(err, 'Could not load all pricing data.'))),
      ),
    );
  }

  delete(id: string): Promise<{ deleted: boolean }> {
    return firstValueFrom(
      this.http.delete<{ deleted: boolean }>(`${URL}/${encodeURIComponent(id)}`).pipe(
        catchError(err => throwError(() => apiErrorMessage(err, 'Could not delete pricing record.'))),
      ),
    );
  }

  getDashboard(): Promise<PricingDashboardResponse> {
    return firstValueFrom(
      this.http.get<PricingDashboardResponse>(`${URL}/dashboard`).pipe(
        catchError(err => throwError(() => apiErrorMessage(err, 'Could not load pricing dashboard.'))),
      ),
    );
  }

  getRecommendations(id: string): Promise<PricingRecommendationResponse> {
    return firstValueFrom(
      this.http.get<PricingRecommendationResponse>(`${URL}/${encodeURIComponent(id)}/recommendations`).pipe(
        catchError(err => throwError(() => apiErrorMessage(err, 'Could not load recommendations.'))),
      ),
    );
  }

  getHistory(pricingId: string, query?: PricingHistoryQuery): Promise<PagedResult<PricingHistoryRow>> {
    let params = new HttpParams();
    if (query?.fromDate) params = params.set('fromDate', query.fromDate);
    if (query?.toDate) params = params.set('toDate', query.toDate);
    if (query?.cursor) params = params.set('cursor', query.cursor);
    if (query?.pageSize) params = params.set('pageSize', query.pageSize);
    return firstValueFrom(
      this.http.get<PagedResult<PricingHistoryRow>>(`${URL}/${encodeURIComponent(pricingId)}/history`, { params }).pipe(
        catchError(err => throwError(() => apiErrorMessage(err, 'Could not load pricing history.'))),
      ),
    );
  }
}
