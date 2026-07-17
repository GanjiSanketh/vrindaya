import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { firstValueFrom, catchError, throwError } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AuditLog, AuditLogQuery } from '../models/audit-log.model';
import { PagedResult } from '../models/inventory.model';

const URL = `${environment.apiBaseUrl}/audit-logs`;

function apiErrorMessage(err: unknown, fallback: string): Error {
  if (err instanceof HttpErrorResponse) {
    const body = err.error as Record<string, unknown>;
    if (body && typeof body['message'] === 'string') {
      return new Error(body['message']);
    }
  }
  return new Error(fallback);
}

function toParams(q: AuditLogQuery): HttpParams {
  let p = new HttpParams();
  if (q.page && q.page > 1) p = p.set('page', q.page);
  if (q.pageSize && q.pageSize !== 50) p = p.set('pageSize', q.pageSize);
  if (q.action) p = p.set('action', q.action);
  if (q.module) p = p.set('module', q.module);
  if (q.search) p = p.set('search', q.search);
  if (q.performedByEmail) p = p.set('performedByEmail', q.performedByEmail);
  if (q.status) p = p.set('status', q.status);
  if (q.dateFrom) p = p.set('dateFrom', q.dateFrom);
  if (q.dateTo) p = p.set('dateTo', q.dateTo);
  return p;
}

@Injectable({ providedIn: 'root' })
export class AuditLogService {
  private readonly http = inject(HttpClient);

  getAll(query: AuditLogQuery): Promise<PagedResult<AuditLog>> {
    return firstValueFrom(
      this.http.get<PagedResult<AuditLog>>(URL, { params: toParams(query) }).pipe(
        catchError(err => throwError(() => apiErrorMessage(err, 'Could not load audit logs.'))),
      ),
    );
  }
}
