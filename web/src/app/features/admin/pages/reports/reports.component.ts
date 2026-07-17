import { Component, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ReportsService } from './reports.service';
import {
  ReportType, REPORT_TYPES, ReportQuery,
  InventoryValuationRow, StockSummaryRow, SupplierReportRow,
  PurchaseReportRow, DeadStockRow, LowStockReportRow, MovementReportRow,
} from './report.models';
import { PagedResult } from '../../models/inventory.model';
import { CategoryService } from '../../../../core/services/category.service';
import { SupplierService } from '../../services/supplier.service';
import { CollectionService } from '../../../../core/services/collection.service';

function today(): string { return new Date().toISOString().slice(0, 10); }
function daysAgo(n: number): string { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); }

interface ColumnDef {
  key: string; label: string; sortable?: boolean;
  render: (row: any) => string;
}

type AnyRow = InventoryValuationRow | StockSummaryRow | SupplierReportRow
  | PurchaseReportRow | DeadStockRow | LowStockReportRow | MovementReportRow;
@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './reports.component.html',
  styleUrl: './reports.component.css',
})
export class ReportsComponent {
  private readonly svc = inject(ReportsService);
  readonly categorySvc = inject(CategoryService);
  readonly supplierSvc = inject(SupplierService);
  readonly collectionSvc = inject(CollectionService);

  readonly REPORT_TYPES = REPORT_TYPES;

  readonly reportType = signal<ReportType>('inventory-valuation');
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly result = signal<PagedResult<AnyRow> | null>(null);
  readonly sortBy = signal<string>('');
  readonly sortDesc = signal(false);

  readonly dateFrom = signal(daysAgo(365));
  readonly dateTo = signal(today());
  readonly search = signal('');
  readonly categoryId = signal('');
  readonly supplierId = signal('');
  readonly collectionId = signal('');
  readonly page = signal(1);
  readonly pageSize = signal(20);

  readonly categories = signal<{ id: string; name: string }[]>([]);
  readonly suppliers = signal<{ id: string; name: string }[]>([]);
  readonly collections = signal<{ id: string; name: string }[]>([]);

  readonly currentLabel = computed(() => REPORT_TYPES.find(r => r.value === this.reportType())?.label ?? '');
  readonly currentDesc = computed(() => REPORT_TYPES.find(r => r.value === this.reportType())?.description ?? '');

  readonly totalCount = computed(() => this.result()?.totalCount ?? 0);
  readonly totalPages = computed(() => Math.ceil(this.totalCount() / this.pageSize()));
  readonly hasPrev = computed(() => this.page() > 1);
  readonly hasNext = computed(() => this.page() < this.totalPages());

  readonly hasActiveFilters = computed(() =>
    !!this.search() || !!this.categoryId() || !!this.supplierId() || !!this.collectionId()
    || this.dateFrom() !== daysAgo(365) || this.dateTo() !== today());

  constructor() {
    void this.loadFilterOptions();
    void this.load();
  }

  private async loadFilterOptions(): Promise<void> {
    try {
      const [cats, suppPage, colls] = await Promise.all([
        this.categorySvc.getAll(),
        this.supplierSvc.getAll(null, 100, undefined, true),
        this.collectionSvc.getAll(),
      ]);
      this.categories.set(cats.map(c => ({ id: c.id, name: c.name })));
      this.suppliers.set(suppPage.items.map(s => ({ id: s.id, name: s.companyName })));
      this.collections.set(colls.map(c => ({ id: c.id, name: c.name })));
    } catch { /* non-critical */ }
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const q: ReportQuery = {
        dateFrom: this.dateFrom() || undefined,
        dateTo: this.dateTo() || undefined,
        categoryId: this.categoryId() || undefined,
        supplierId: this.supplierId() || undefined,
        collectionId: this.collectionId() || undefined,
        search: this.search() || undefined,
        sortBy: this.sortBy() || undefined,
        sortDesc: this.sortDesc(),
        page: this.page(),
        pageSize: this.pageSize(),
      };

      let data: PagedResult<AnyRow>;
      switch (this.reportType()) {
        case 'inventory-valuation': data = await this.svc.getInventoryValuation(q); break;
        case 'stock-summary':       data = await this.svc.getStockSummary(q); break;
        case 'supplier':            data = await this.svc.getSupplierReport(q); break;
        case 'purchase':            data = await this.svc.getPurchaseReport(q); break;
        case 'dead-stock':          data = await this.svc.getDeadStockReport(q); break;
        case 'low-stock':           data = await this.svc.getLowStockReport(q); break;
        case 'movement':            data = await this.svc.getMovementReport(q); break;
        default: throw new Error('Unknown report type');
      }
      this.result.set(data);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Failed to load report.');
    } finally {
      this.loading.set(false);
    }
  }

  selectReport(type: ReportType): void {
    if (type === this.reportType()) return;
    this.reportType.set(type);
    this.page.set(1);
    this.sortBy.set('');
    this.sortDesc.set(false);
    void this.load();
  }

  onFilterChange(): void { this.page.set(1); void this.load(); }
  clearFilters(): void {
    this.dateFrom.set(daysAgo(365));
    this.dateTo.set(today());
    this.search.set('');
    this.categoryId.set('');
    this.supplierId.set('');
    this.collectionId.set('');
    this.onFilterChange();
  }

  goToPage(p: number): void { this.page.set(p); void this.load(); }

  sort(field: string): void {
    if (this.sortBy() === field) { this.sortDesc.set(!this.sortDesc()); }
    else { this.sortBy.set(field); this.sortDesc.set(false); }
    void this.load();
  }

  sortIcon(field: string): string {
    if (this.sortBy() !== field) return 'bi-arrow-down-up';
    return this.sortDesc() ? 'bi-sort-down' : 'bi-sort-up';
  }

  exportCsv(): void {
    const url = this.svc.exportCsv(this.reportType(), {
      dateFrom: this.dateFrom() || undefined,
      dateTo: this.dateTo() || undefined,
      categoryId: this.categoryId() || undefined,
      supplierId: this.supplierId() || undefined,
      collectionId: this.collectionId() || undefined,
      search: this.search() || undefined,
      page: 1, pageSize: 999999,
    });
    window.open(url, '_blank');
  }

  async exportExcel(): Promise<void> {
    try {
      const XLSX = await import('xlsx');
      const r = this.result();
      if (!r || r.items.length === 0) return;
      const ws = XLSX.utils.json_to_sheet(r.items.map(row => ({ ...row })));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, this.currentLabel());
      XLSX.writeFile(wb, `${this.reportType()}-${today()}.xlsx`);
    } catch { this.error.set('Excel export failed.'); }
  }

  exportPdf(): void { window.print(); }
  // ── Column definitions ──
  readonly columns = computed<ColumnDef[]>(() => {
    switch (this.reportType()) {
      case 'inventory-valuation': return this.invValCols;
      case 'stock-summary':       return this.stockSumCols;
      case 'supplier':            return this.supplierCols;
      case 'purchase':            return this.purchaseCols;
      case 'dead-stock':          return this.deadStockCols;
      case 'low-stock':           return this.lowStockCols;
      case 'movement':            return this.movementCols;
      default: return [];
    }
  });

  private readonly invValCols: ColumnDef[] = [
    { key: 'productName', label: 'Product', sortable: true, render: r => r.productName || '—' },
    { key: 'category', label: 'Category', sortable: true, render: r => r.category || '—' },
    { key: 'color', label: 'Color', render: r => r.color },
    { key: 'size', label: 'Size', render: r => r.size },
    { key: 'sku', label: 'SKU', render: r => r.sku },
    { key: 'currentStock', label: 'Stock', sortable: true, render: r => r.currentStock?.toString() ?? '0' },
    { key: 'averageCost', label: 'Avg Cost', sortable: true, render: r => this.fmt(r.averageCost) },
    { key: 'stockValue', label: 'Stock Value', sortable: true, render: r => this.fmt(r.stockValue) },
    { key: 'sellingPrice', label: 'Sell Price', sortable: true, render: r => r.sellingPrice != null ? this.fmt(r.sellingPrice) : '—' },
    { key: 'profitMargin', label: 'Margin %', render: r => r.profitMargin != null ? `${r.profitMargin}%` : '—' },
    { key: 'status', label: 'Status', sortable: true, render: r => this.statusBadge(r.status) },
  ];

  private readonly stockSumCols: ColumnDef[] = [
    { key: 'productName', label: 'Product', sortable: true, render: r => r.productName || '—' },
    { key: 'category', label: 'Category', sortable: true, render: r => r.category || '—' },
    { key: 'variantCount', label: 'Variants', sortable: true, render: r => r.variantCount?.toString() ?? '0' },
    { key: 'totalStock', label: 'Total Stock', sortable: true, render: r => r.totalStock?.toString() ?? '0' },
    { key: 'reservedStock', label: 'Reserved', render: r => r.reservedStock?.toString() ?? '0' },
    { key: 'soldStock', label: 'Sold', render: r => r.soldStock?.toString() ?? '0' },
    { key: 'returnedStock', label: 'Returned', render: r => r.returnedStock?.toString() ?? '0' },
    { key: 'damagedStock', label: 'Damaged', render: r => r.damagedStock?.toString() ?? '0' },
    { key: 'totalValue', label: 'Total Value', sortable: true, render: r => this.fmt(r.totalValue) },
  ];

  private readonly supplierCols: ColumnDef[] = [
    { key: 'supplierName', label: 'Supplier', sortable: true, render: r => r.supplierName },
    { key: 'totalPurchases', label: 'Purchases', sortable: true, render: r => r.totalPurchases?.toString() ?? '0' },
    { key: 'totalAmount', label: 'Total Amount', sortable: true, render: r => this.fmt(r.totalAmount) },
    { key: 'lastPurchaseDate', label: 'Last Purchase', sortable: true, render: r => r.lastPurchaseDate ? this.d(r.lastPurchaseDate) : '—' },
  ];

  private readonly purchaseCols: ColumnDef[] = [
    { key: 'purchaseDate', label: 'Date', sortable: true, render: r => this.d(r.purchaseDate) },
    { key: 'invoiceNumber', label: 'Invoice', render: r => r.invoiceNumber },
    { key: 'supplier', label: 'Supplier', sortable: true, render: r => r.supplier },
    { key: 'productName', label: 'Product', sortable: true, render: r => r.productName || '—' },
    { key: 'color', label: 'Color', render: r => r.color || '—' },
    { key: 'size', label: 'Size', render: r => r.size || '—' },
    { key: 'quantity', label: 'Qty', sortable: true, render: r => r.quantity?.toString() ?? '0' },
    { key: 'purchasePrice', label: 'Price', render: r => this.fmt(r.purchasePrice) },
    { key: 'discount', label: 'Discount', render: r => this.fmt(r.discount) },
    { key: 'gst', label: 'GST', render: r => this.fmt(r.gst) },
    { key: 'total', label: 'Total', sortable: true, render: r => this.fmt(r.total) },
    { key: 'status', label: 'Status', sortable: true, render: r => r.status },
  ];

  private readonly deadStockCols: ColumnDef[] = [
    { key: 'productName', label: 'Product', sortable: true, render: r => r.productName || '—' },
    { key: 'color', label: 'Color', render: r => r.color },
    { key: 'size', label: 'Size', render: r => r.size },
    { key: 'sku', label: 'SKU', render: r => r.sku },
    { key: 'currentStock', label: 'Stock', sortable: true, render: r => r.currentStock?.toString() ?? '0' },
    { key: 'stockValue', label: 'Value', sortable: true, render: r => this.fmt(r.stockValue) },
    { key: 'daysSinceLastMovement', label: 'Days Inactive', sortable: true, render: r => r.daysSinceLastMovement?.toString() ?? '—' },
    { key: 'lastMovementDate', label: 'Last Move', render: r => r.lastMovementDate ? this.d(r.lastMovementDate) : '—' },
  ];

  private readonly lowStockCols: ColumnDef[] = [
    { key: 'productName', label: 'Product', sortable: true, render: r => r.productName || '—' },
    { key: 'color', label: 'Color', render: r => r.color },
    { key: 'size', label: 'Size', render: r => r.size },
    { key: 'sku', label: 'SKU', render: r => r.sku },
    { key: 'currentStock', label: 'Stock', sortable: true, render: r => r.currentStock?.toString() ?? '0' },
    { key: 'reservedStock', label: 'Reserved', render: r => r.reservedStock?.toString() ?? '0' },
    { key: 'lowStockThreshold', label: 'Low Threshold', sortable: true, render: r => r.lowStockThreshold?.toString() ?? '0' },
    { key: 'criticalStockThreshold', label: 'Critical Threshold', render: r => r.criticalStockThreshold?.toString() ?? '0' },
    { key: 'status', label: 'Status', sortable: true, render: r => this.statusBadge(r.status) },
  ];

  private readonly movementCols: ColumnDef[] = [
    { key: 'createdAt', label: 'Date', sortable: true, render: r => this.dt(r.createdAt) },
    { key: 'productName', label: 'Product', sortable: true, render: r => r.productName || '—' },
    { key: 'color', label: 'Color', render: r => r.color || '—' },
    { key: 'size', label: 'Size', render: r => r.size || '—' },
    { key: 'sku', label: 'SKU', render: r => r.sku },
    { key: 'movementType', label: 'Type', sortable: true, render: r => r.movementType },
    { key: 'quantity', label: 'Qty', sortable: true, render: r => r.quantity?.toString() ?? '0' },
    { key: 'delta', label: 'Delta', sortable: true, render: r => r.delta?.toString() ?? '0' },
    { key: 'reason', label: 'Reason', render: r => r.reason || '—' },
    { key: 'createdBy', label: 'By', render: r => r.createdBy },
  ];

  // ── Formatting helpers ──
  fmt(v: number): string { return `₹${v.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`; }
  d(iso: string): string { return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
  dt(iso: string): string { return new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }

  private statusBadge(status: string): string {
    const cls = status.toLowerCase();
    const label = status === 'OutOfStock' ? 'Out of Stock' : status;
    return `<span class="rp-badge rp-badge--${cls}">${label}</span>`;
  }
}
