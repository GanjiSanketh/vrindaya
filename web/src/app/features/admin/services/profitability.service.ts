import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ProductProfitabilityRow, ProfitabilityFilters } from '../models/product-listing.model';
import { PagedResult } from '../models/inventory.model';

const URL = `${environment.apiBaseUrl}/profitability`;

function apiErrorMessage(err: any, fallback: string): string {
  const msg = err?.error?.message ?? err?.message ?? fallback;
  return typeof msg === 'string' ? msg : fallback;
}

@Injectable({ providedIn: 'root' })
export class ProfitabilityService {
  private readonly http = inject(HttpClient);

  getProfitability(filters: ProfitabilityFilters): Promise<PagedResult<ProductProfitabilityRow>> {
    let params = new HttpParams().set('pageSize', String(filters.pageSize ?? 50));
    if (filters.filter) params = params.set('filter', filters.filter);
    if (filters.marketplace) params = params.set('marketplace', filters.marketplace);
    if (filters.category) params = params.set('category', filters.category);
    if (filters.search) params = params.set('search', filters.search);
    if (filters.cursor) params = params.set('cursor', filters.cursor);
    return firstValueFrom(
      this.http.get<PagedResult<ProductProfitabilityRow>>(URL, { params }).pipe(
        catchError(err => throwError(() => apiErrorMessage(err, 'Could not load profitability data.'))),
      ),
    );
  }
}
