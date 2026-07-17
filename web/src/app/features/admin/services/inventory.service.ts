import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { firstValueFrom, catchError, throwError } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  InventoryVariant, UpsertInventoryVariantRequest, RecordStockMovementRequest,
  PurchaseEntry, CreatePurchaseEntryRequest, StockMovement, MovementHistoryFilters,
  InventoryDashboard, InventoryDashboardFilters, PagedResult, InventoryStatus,
  BulkUpdateStockThresholdsRequest,
} from '../models/inventory.model';

const URL = `${environment.apiBaseUrl}/inventory-management`;

/** Same HttpErrorResponse-message extraction convention as admin-users.service.ts. */
function apiErrorMessage(err: unknown, fallback: string): Error {
  if (err instanceof HttpErrorResponse && typeof err.error?.message === 'string') {
    return new Error(err.error.message);
  }
  return new Error(fallback);
}

@Injectable({ providedIn: 'root' })
export class InventoryService {
  private readonly http = inject(HttpClient);

  // ── Variant inventory (per Product+Color+Size) — includes the Pricing Engine ─
  getVariants(cursor: string | null, pageSize = 20): Promise<PagedResult<InventoryVariant>> {
    let params = new HttpParams().set('pageSize', pageSize);
    if (cursor) params = params.set('cursor', cursor);

    return firstValueFrom(
      this.http.get<PagedResult<InventoryVariant>>(`${URL}/variants`, { params }).pipe(
        catchError(err => throwError(() => apiErrorMessage(err, 'Could not load inventory. Please try again.'))),
      ),
    );
  }

  getVariant(variantId: string): Promise<InventoryVariant> {
    return firstValueFrom(
      this.http.get<InventoryVariant>(`${URL}/variants/${encodeURIComponent(variantId)}`).pipe(
        catchError(err => throwError(() => apiErrorMessage(err, 'Could not load this inventory variant.'))),
      ),
    );
  }

  getVariantsByProduct(productId: string): Promise<InventoryVariant[]> {
    return firstValueFrom(
      this.http.get<InventoryVariant[]>(`${URL}/products/${encodeURIComponent(productId)}/variants`).pipe(
        catchError(err => throwError(() => apiErrorMessage(err, 'Could not load this product’s variants.'))),
      ),
    );
  }

  upsertVariant(productId: string, request: UpsertInventoryVariantRequest): Promise<InventoryVariant> {
    return firstValueFrom(
      this.http.put<InventoryVariant>(`${URL}/products/${encodeURIComponent(productId)}/variants`, request).pipe(
        catchError(err => throwError(() => apiErrorMessage(err, 'Failed to save variant.'))),
      ),
    );
  }

  recordMovement(variantId: string, request: RecordStockMovementRequest): Promise<InventoryVariant> {
    return firstValueFrom(
      this.http.patch<InventoryVariant>(`${URL}/variants/${encodeURIComponent(variantId)}/movements`, request).pipe(
        catchError(err => throwError(() => apiErrorMessage(err, 'Failed to record movement.'))),
      ),
    );
  }

  getLowStockVariants(): Promise<InventoryVariant[]> {
    return firstValueFrom(
      this.http.get<InventoryVariant[]>(`${URL}/variants/low-stock`).pipe(
        catchError(err => throwError(() => apiErrorMessage(err, 'Could not load the low stock report.'))),
      ),
    );
  }

  getVariantsByStatus(status: Exclude<InventoryStatus, 'Healthy'>): Promise<InventoryVariant[]> {
    return firstValueFrom(
      this.http.get<InventoryVariant[]>(`${URL}/variants/status/${encodeURIComponent(status)}`).pipe(
        catchError(err => throwError(() => apiErrorMessage(err, 'Could not load the selected inventory status.'))),
      ),
    );
  }

  bulkUpdateStockThresholds(request: BulkUpdateStockThresholdsRequest): Promise<InventoryVariant[]> {
    return firstValueFrom(
      this.http.patch<InventoryVariant[]>(`${URL}/variants/thresholds`, request).pipe(
        catchError(err => throwError(() => apiErrorMessage(err, 'Could not update stock thresholds.'))),
      ),
    );
  }

  // ── Purchase Register ──────────────────────────────────────────────────
  recordPurchase(request: CreatePurchaseEntryRequest): Promise<PurchaseEntry> {
    return firstValueFrom(
      this.http.post<PurchaseEntry>(`${URL}/purchase-entries`, request).pipe(
        catchError(err => throwError(() => apiErrorMessage(err, 'Failed to record purchase entry.'))),
      ),
    );
  }

  updatePurchase(id: string, request: CreatePurchaseEntryRequest): Promise<PurchaseEntry> {
    return firstValueFrom(
      this.http.put<PurchaseEntry>(`${URL}/purchase-entries/${encodeURIComponent(id)}`, request).pipe(
        catchError(err => throwError(() => apiErrorMessage(err, 'Failed to update purchase entry.'))),
      ),
    );
  }

  getPurchaseEntries(cursor: string | null, pageSize = 20): Promise<PagedResult<PurchaseEntry>> {
    let params = new HttpParams().set('pageSize', pageSize);
    if (cursor) params = params.set('cursor', cursor);

    return firstValueFrom(
      this.http.get<PagedResult<PurchaseEntry>>(`${URL}/purchase-entries`, { params }).pipe(
        catchError(err => throwError(() => apiErrorMessage(err, 'Could not load purchase entries.'))),
      ),
    );
  }

  getPurchaseEntry(id: string): Promise<PurchaseEntry> {
    return firstValueFrom(
      this.http.get<PurchaseEntry>(`${URL}/purchase-entries/${encodeURIComponent(id)}`).pipe(
        catchError(err => throwError(() => apiErrorMessage(err, 'Could not load this purchase entry.'))),
      ),
    );
  }

  getMovements(cursor: string | null, pageSize = 20, filters?: MovementHistoryFilters): Promise<PagedResult<StockMovement>> {
    let params = new HttpParams().set('pageSize', pageSize);
    if (cursor) params = params.set('cursor', cursor);
    if (filters?.productId) params = params.set('productId', filters.productId);
    if (filters?.movementType) params = params.set('movementType', filters.movementType);
    if (filters?.search) params = params.set('search', filters.search);
    if (filters?.dateFrom) params = params.set('dateFrom', filters.dateFrom);
    if (filters?.dateTo) params = params.set('dateTo', filters.dateTo);

    return firstValueFrom(
      this.http.get<PagedResult<StockMovement>>(`${URL}/movements`, { params }).pipe(
        catchError(err => throwError(() => apiErrorMessage(err, 'Could not load stock movements.'))),
      ),
    );
  }

  getDashboard(filters?: InventoryDashboardFilters): Promise<InventoryDashboard> {
    let params = new HttpParams();
    if (filters?.category) params = params.set('category', filters.category);
    if (filters?.supplierId) params = params.set('supplierId', filters.supplierId);
    if (filters?.collectionId) params = params.set('collectionId', filters.collectionId);
    if (filters?.dateFrom) params = params.set('dateFrom', filters.dateFrom);
    if (filters?.dateTo) params = params.set('dateTo', filters.dateTo);

    return firstValueFrom(
      this.http.get<InventoryDashboard>(`${URL}/dashboard`, { params }).pipe(
        catchError(err => throwError(() => apiErrorMessage(err, 'Could not load the inventory dashboard.'))),
      ),
    );
  }
}
