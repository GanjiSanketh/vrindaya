import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { firstValueFrom, catchError, throwError } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Supplier, SupplierRequest, SupplierStats, SupplierSortField } from '../models/supplier.model';
import { PagedResult, PurchaseEntry } from '../models/inventory.model';

const URL = `${environment.apiBaseUrl}/suppliers`;

/** Same HttpErrorResponse-message extraction convention as admin-users.service.ts/inventory.service.ts. */
function apiErrorMessage(err: unknown, fallback: string): Error {
  if (err instanceof HttpErrorResponse && typeof err.error?.message === 'string') {
    return new Error(err.error.message);
  }
  return new Error(fallback);
}

@Injectable({ providedIn: 'root' })
export class SupplierService {
  private readonly http = inject(HttpClient);

  getAll(
    cursor: string | null, pageSize = 20, search?: string, activeOnly?: boolean,
    sortBy: SupplierSortField = 'companyName', sortDescending = false,
  ): Promise<PagedResult<Supplier>> {
    let params = new HttpParams().set('pageSize', pageSize).set('sortBy', sortBy).set('sortDescending', sortDescending);
    if (cursor) params = params.set('cursor', cursor);
    if (search) params = params.set('search', search);
    if (activeOnly !== undefined) params = params.set('activeOnly', activeOnly);

    return firstValueFrom(
      this.http.get<PagedResult<Supplier>>(URL, { params }).pipe(
        catchError(err => throwError(() => apiErrorMessage(err, 'Could not load suppliers. Please try again.'))),
      ),
    );
  }

  getOne(id: string): Promise<Supplier> {
    return firstValueFrom(
      this.http.get<Supplier>(`${URL}/${encodeURIComponent(id)}`).pipe(
        catchError(err => throwError(() => apiErrorMessage(err, 'Could not load this supplier.'))),
      ),
    );
  }

  create(request: SupplierRequest): Promise<Supplier> {
    return firstValueFrom(
      this.http.post<Supplier>(URL, request).pipe(
        catchError(err => throwError(() => apiErrorMessage(err, 'Failed to add supplier.'))),
      ),
    );
  }

  update(id: string, request: SupplierRequest): Promise<Supplier> {
    return firstValueFrom(
      this.http.put<Supplier>(`${URL}/${encodeURIComponent(id)}`, request).pipe(
        catchError(err => throwError(() => apiErrorMessage(err, 'Failed to update supplier.'))),
      ),
    );
  }

  activate(id: string): Promise<Supplier> {
    return firstValueFrom(
      this.http.patch<Supplier>(`${URL}/${encodeURIComponent(id)}/activate`, {}).pipe(
        catchError(err => throwError(() => apiErrorMessage(err, 'Failed to activate supplier.'))),
      ),
    );
  }

  deactivate(id: string): Promise<Supplier> {
    return firstValueFrom(
      this.http.patch<Supplier>(`${URL}/${encodeURIComponent(id)}/deactivate`, {}).pipe(
        catchError(err => throwError(() => apiErrorMessage(err, 'Failed to deactivate supplier.'))),
      ),
    );
  }

  getStats(id: string): Promise<SupplierStats> {
    return firstValueFrom(
      this.http.get<SupplierStats>(`${URL}/${encodeURIComponent(id)}/stats`).pipe(
        catchError(err => throwError(() => apiErrorMessage(err, 'Could not load supplier statistics.'))),
      ),
    );
  }

  getPurchaseHistory(id: string, cursor: string | null, pageSize = 20): Promise<PagedResult<PurchaseEntry>> {
    let params = new HttpParams().set('pageSize', pageSize);
    if (cursor) params = params.set('cursor', cursor);

    return firstValueFrom(
      this.http.get<PagedResult<PurchaseEntry>>(`${URL}/${encodeURIComponent(id)}/purchase-history`, { params }).pipe(
        catchError(err => throwError(() => apiErrorMessage(err, 'Could not load purchase history.'))),
      ),
    );
  }
}
