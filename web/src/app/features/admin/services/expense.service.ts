import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Expense, CreateExpenseRequest, UpdateExpenseRequest, ExpenseSummary } from '../models/expense.model';
import { PagedResult } from '../models/inventory.model';

const URL = `${environment.apiBaseUrl}/expenses`;

function apiErrorMessage(err: any, fallback: string): string {
  const msg = err?.error?.message ?? err?.message ?? fallback;
  return typeof msg === 'string' ? msg : fallback;
}

@Injectable({ providedIn: 'root' })
export class ExpenseService {
  private readonly http = inject(HttpClient);

  getAll(cursor?: string, pageSize = 20, search?: string, category?: string, dateFrom?: string, dateTo?: string): Promise<PagedResult<Expense>> {
    let params = new HttpParams().set('pageSize', pageSize);
    if (cursor) params = params.set('cursor', cursor);
    if (search) params = params.set('search', search);
    if (category) params = params.set('category', category);
    if (dateFrom) params = params.set('dateFrom', dateFrom);
    if (dateTo) params = params.set('dateTo', dateTo);
    return firstValueFrom(
      this.http.get<PagedResult<Expense>>(URL, { params }).pipe(
        catchError(err => throwError(() => apiErrorMessage(err, 'Could not load expenses.'))),
      ),
    );
  }

  getOne(id: string): Promise<Expense> {
    return firstValueFrom(
      this.http.get<Expense>(`${URL}/${id}`).pipe(
        catchError(err => throwError(() => apiErrorMessage(err, 'Could not load expense.'))),
      ),
    );
  }

  create(request: CreateExpenseRequest): Promise<Expense> {
    return firstValueFrom(
      this.http.post<Expense>(URL, request).pipe(
        catchError(err => throwError(() => apiErrorMessage(err, 'Could not create expense.'))),
      ),
    );
  }

  update(id: string, request: UpdateExpenseRequest): Promise<Expense> {
    return firstValueFrom(
      this.http.put<Expense>(`${URL}/${id}`, request).pipe(
        catchError(err => throwError(() => apiErrorMessage(err, 'Could not update expense.'))),
      ),
    );
  }

  delete(id: string): Promise<void> {
    return firstValueFrom(
      this.http.delete<void>(`${URL}/${id}`).pipe(
        catchError(err => throwError(() => apiErrorMessage(err, 'Could not delete expense.'))),
      ),
    );
  }

  getMonthlySummary(year: number, month?: number): Promise<ExpenseSummary> {
    let params = new HttpParams().set('year', year);
    if (month) params = params.set('month', month);
    return firstValueFrom(
      this.http.get<ExpenseSummary>(`${URL}/summary/monthly`, { params }).pipe(
        catchError(err => throwError(() => apiErrorMessage(err, 'Could not load monthly summary.'))),
      ),
    );
  }

  getYearlySummary(year: number): Promise<ExpenseSummary> {
    return firstValueFrom(
      this.http.get<ExpenseSummary>(`${URL}/summary/yearly`, { params: new HttpParams().set('year', year) }).pipe(
        catchError(err => throwError(() => apiErrorMessage(err, 'Could not load yearly summary.'))),
      ),
    );
  }
}
