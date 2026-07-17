import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { InventoryForecastRow, ForecastFilters, PagedResult } from '../models/inventory.model';

const URL = `${environment.apiBaseUrl}/inventory-forecast`;

function apiErrorMessage(err: any, fallback: string): string {
  const msg = err?.error?.message ?? err?.message ?? fallback;
  return typeof msg === 'string' ? msg : fallback;
}

@Injectable({ providedIn: 'root' })
export class ForecastService {
  private readonly http = inject(HttpClient);

  getForecast(filters: ForecastFilters): Promise<PagedResult<InventoryForecastRow>> {
    let params = new HttpParams().set('pageSize', String(filters.pageSize ?? 50));
    if (filters.status) params = params.set('status', filters.status);
    if (filters.search) params = params.set('search', filters.search);
    if (filters.category) params = params.set('category', filters.category);
    if (filters.supplier) params = params.set('supplier', filters.supplier);
    if (filters.cursor) params = params.set('cursor', filters.cursor);
    return firstValueFrom(
      this.http.get<PagedResult<InventoryForecastRow>>(URL, { params }).pipe(
        catchError(err => throwError(() => apiErrorMessage(err, 'Could not load forecast data.'))),
      ),
    );
  }
}
