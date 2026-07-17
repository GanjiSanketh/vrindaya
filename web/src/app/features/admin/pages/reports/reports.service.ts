import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { firstValueFrom, catchError, throwError } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { PagedResult } from '../../models/inventory.model';
import {
  ReportQuery, ReportType,
  InventoryValuationRow, StockSummaryRow, SupplierReportRow,
  PurchaseReportRow, DeadStockRow, LowStockReportRow, MovementReportRow,
} from './report.models';

const URL = `${environment.apiBaseUrl}/reports`;

function apiErrorMessage(err: unknown, fallback: string): Error {
  if (err instanceof HttpErrorResponse && typeof err.error?.message === 'string') {
    return new Error(err.error.message);
  }
  return new Error(fallback);
}

@Injectable({ providedIn: 'root' })
export class ReportsService {
  private readonly http = inject(HttpClient);

  private params(query: ReportQuery): HttpParams {
    let p = new HttpParams().set('page', query.page).set('pageSize', query.pageSize);
    if (query.dateFrom) p = p.set('dateFrom', query.dateFrom);
    if (query.dateTo) p = p.set('dateTo', query.dateTo);
    if (query.categoryId) p = p.set('categoryId', query.categoryId);
    if (query.supplierId) p = p.set('supplierId', query.supplierId);
    if (query.productId) p = p.set('productId', query.productId);
    if (query.collectionId) p = p.set('collectionId', query.collectionId);
    if (query.search) p = p.set('search', query.search);
    if (query.sortBy) p = p.set('sortBy', query.sortBy);
    if (query.sortDesc) p = p.set('sortDesc', query.sortDesc);
    return p;
  }

  getInventoryValuation(query: ReportQuery): Promise<PagedResult<InventoryValuationRow>> {
    return firstValueFrom(
      this.http.get<PagedResult<InventoryValuationRow>>(`${URL}/inventory-valuation`, { params: this.params(query) })
        .pipe(catchError(err => throwError(() => apiErrorMessage(err, 'Failed to load inventory valuation report.')))),
    );
  }

  getStockSummary(query: ReportQuery): Promise<PagedResult<StockSummaryRow>> {
    return firstValueFrom(
      this.http.get<PagedResult<StockSummaryRow>>(`${URL}/stock-summary`, { params: this.params(query) })
        .pipe(catchError(err => throwError(() => apiErrorMessage(err, 'Failed to load stock summary report.')))),
    );
  }

  getSupplierReport(query: ReportQuery): Promise<PagedResult<SupplierReportRow>> {
    return firstValueFrom(
      this.http.get<PagedResult<SupplierReportRow>>(`${URL}/supplier`, { params: this.params(query) })
        .pipe(catchError(err => throwError(() => apiErrorMessage(err, 'Failed to load supplier report.')))),
    );
  }

  getPurchaseReport(query: ReportQuery): Promise<PagedResult<PurchaseReportRow>> {
    return firstValueFrom(
      this.http.get<PagedResult<PurchaseReportRow>>(`${URL}/purchase`, { params: this.params(query) })
        .pipe(catchError(err => throwError(() => apiErrorMessage(err, 'Failed to load purchase report.')))),
    );
  }

  getDeadStockReport(query: ReportQuery): Promise<PagedResult<DeadStockRow>> {
    return firstValueFrom(
      this.http.get<PagedResult<DeadStockRow>>(`${URL}/dead-stock`, { params: this.params(query) })
        .pipe(catchError(err => throwError(() => apiErrorMessage(err, 'Failed to load dead stock report.')))),
    );
  }

  getLowStockReport(query: ReportQuery): Promise<PagedResult<LowStockReportRow>> {
    return firstValueFrom(
      this.http.get<PagedResult<LowStockReportRow>>(`${URL}/low-stock`, { params: this.params(query) })
        .pipe(catchError(err => throwError(() => apiErrorMessage(err, 'Failed to load low stock report.')))),
    );
  }

  getMovementReport(query: ReportQuery): Promise<PagedResult<MovementReportRow>> {
    return firstValueFrom(
      this.http.get<PagedResult<MovementReportRow>>(`${URL}/movement`, { params: this.params(query) })
        .pipe(catchError(err => throwError(() => apiErrorMessage(err, 'Failed to load movement report.')))),
    );
  }

  exportCsv(reportType: ReportType, query: ReportQuery): string {
    let p = this.params({ ...query, page: 1, pageSize: 999999 });
    return `${URL}/${reportType}/export?${p.toString()}`;
  }
}
