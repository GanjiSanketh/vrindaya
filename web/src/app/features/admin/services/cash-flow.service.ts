import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { CashFlowDashboard } from '../models/cash-flow.model';

const URL = `${environment.apiBaseUrl}/cash-flow`;

function apiErrorMessage(err: any, fallback: string): string {
  const msg = err?.error?.message ?? err?.message ?? fallback;
  return typeof msg === 'string' ? msg : fallback;
}

@Injectable({ providedIn: 'root' })
export class CashFlowService {
  private readonly http = inject(HttpClient);

  getDashboard(year: number, month?: number): Promise<CashFlowDashboard> {
    let params = new HttpParams().set('year', year);
    if (month) params = params.set('month', month);
    return firstValueFrom(
      this.http.get<CashFlowDashboard>(`${URL}/dashboard`, { params }).pipe(
        catchError(err => throwError(() => apiErrorMessage(err, 'Could not load Cash Flow Dashboard.'))),
      ),
    );
  }
}
