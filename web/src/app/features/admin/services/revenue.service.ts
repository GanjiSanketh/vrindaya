import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Revenue, CreateRevenueRequest, UpdateRevenueRequest, RevenueSummary } from '../models/revenue.model';
import { PagedResult } from '../models/inventory.model';

const URL = `${environment.apiBaseUrl}/revenues`;

function apiErrorMessage(err: any, fallback: string): string {
  const msg = err?.error?.message ?? err?.message ?? fallback;
  return typeof msg === 'string' ? msg : fallback;
}

@Injectable({ providedIn: 'root' })
export class RevenueService {
  private readonly http = inject(HttpClient);

  getAll(cursor?: string, pageSize = 20, search?: string, source?: string, status?: string, dateFrom?: string, dateTo?: string): Promise<PagedResult<Revenue>> {
    let params = new HttpParams().set('pageSize', pageSize);
    if (cursor) params = params.set('cursor', cursor);
    if (search) params = params.set('search', search);
    if (source) params = params.set('source', source);
    if (status) params = params.set('status', status);
    if (dateFrom) params = params.set('dateFrom', dateFrom);
    if (dateTo) params = params.set('dateTo', dateTo);
    return firstValueFrom(
      this.http.get<PagedResult<Revenue>>(URL, { params }).pipe(
        catchError(err => throwError(() => apiErrorMessage(err, 'Could not load revenues.'))),
      ),
    );
  }

  getOne(id: string): Promise<Revenue> {
    return firstValueFrom(
      this.http.get<Revenue>(`${URL}/${id}`).pipe(
        catchError(err => throwError(() => apiErrorMessage(err, 'Could not load revenue.'))),
      ),
    );
  }

  create(request: CreateRevenueRequest): Promise<Revenue> {
    return firstValueFrom(
      this.http.post<Revenue>(URL, request).pipe(
        catchError(err => throwError(() => apiErrorMessage(err, 'Could not create revenue.'))),
      ),
    );
  }

  update(id: string, request: UpdateRevenueRequest): Promise<Revenue> {
    return firstValueFrom(
      this.http.put<Revenue>(`${URL}/${id}`, request).pipe(
        catchError(err => throwError(() => apiErrorMessage(err, 'Could not update revenue.'))),
      ),
    );
  }

  delete(id: string): Promise<void> {
    return firstValueFrom(
      this.http.delete<void>(`${URL}/${id}`).pipe(
        catchError(err => throwError(() => apiErrorMessage(err, 'Could not delete revenue.'))),
      ),
    );
  }

  getMonthlySummary(year: number, month?: number): Promise<RevenueSummary> {
    let params = new HttpParams().set('year', year);
    if (month) params = params.set('month', month);
    return firstValueFrom(
      this.http.get<RevenueSummary>(`${URL}/summary/monthly`, { params }).pipe(
        catchError(err => throwError(() => apiErrorMessage(err, 'Could not load monthly summary.'))),
      ),
    );
  }

  getYearlySummary(year: number): Promise<RevenueSummary> {
    return firstValueFrom(
      this.http.get<RevenueSummary>(`${URL}/summary/yearly`, { params: new HttpParams().set('year', year) }).pipe(
        catchError(err => throwError(() => apiErrorMessage(err, 'Could not load yearly summary.'))),
      ),
    );
  }
}
