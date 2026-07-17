import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { SettlementReconciliation } from '../models/settlement.model';

const URL = `${environment.apiBaseUrl}/settlement-reconciliation`;

function apiErrorMessage(err: any, fallback: string): string {
  const msg = err?.error?.message ?? err?.message ?? fallback;
  return typeof msg === 'string' ? msg : fallback;
}

@Injectable({ providedIn: 'root' })
export class SettlementReconciliationService {
  private readonly http = inject(HttpClient);

  getReconciliation(source?: string, type?: string, year?: number, month?: number): Promise<SettlementReconciliation> {
    let params = new HttpParams();
    if (source) params = params.set('source', source);
    if (type) params = params.set('type', type);
    if (year) params = params.set('year', year);
    if (month) params = params.set('month', month);
    return firstValueFrom(
      this.http.get<SettlementReconciliation>(URL, { params }).pipe(
        catchError(err => throwError(() => apiErrorMessage(err, 'Could not load settlement reconciliation.'))),
      ),
    );
  }
}
