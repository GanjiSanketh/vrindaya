import { Component, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe, JsonPipe } from '@angular/common';
import { AuditLogService } from '../../services/audit-log.service';
import { AuditLog, AuditLogQuery, AUDIT_LOG_MODULES, AUDIT_LOG_ACTIONS, ACTION_LABELS } from '../../models/audit-log.model';
import { PagedResult } from '../../models/inventory.model';

@Component({
  selector: 'app-audit-log-list',
  standalone: true,
  imports: [FormsModule, DatePipe, JsonPipe],
  templateUrl: './audit-log-list.component.html',
  styleUrl: './audit-log-list.component.css',
})
export class AuditLogListComponent {
  private readonly svc = inject(AuditLogService);

  /* ── Data ─────────────────────────────────────────────────── */
  readonly result = signal<PagedResult<AuditLog> | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  /* ── Filters ──────────────────────────────────────────────── */
  readonly searchTerm = signal('');
  readonly moduleFilter = signal('');
  readonly actionFilter = signal('');
  readonly statusFilter = signal('');
  readonly performedByFilter = signal('');
  readonly dateFrom = signal('');
  readonly dateTo = signal('');
  readonly activeFilters = signal<{ key: string; label: string }[]>([]);

  /* ── Pagination (page-number based) ───────────────────────── */
  readonly page = signal(1);
  readonly pageSize = signal(50);
  readonly totalPages = computed(() => {
    const r = this.result();
    if (!r) return 1;
    return Math.max(1, Math.ceil(r.totalCount / this.pageSize()));
  });

  /* ── Detail drawer ────────────────────────────────────────── */
  readonly selectedLog = signal<AuditLog | null>(null);
  readonly jsonViewMode = signal<'split' | 'before' | 'after'>('split');

  /* ── Available filter options ─────────────────────────────── */
  readonly modules = AUDIT_LOG_MODULES;
  readonly actions = AUDIT_LOG_ACTIONS;
  readonly statuses = ['Success', 'Failure'];

  /* ── Debounce timer ───────────────────────────────────────── */
  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    void this.load();
  }

  /* ── Data loading ─────────────────────────────────────────── */
  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const q = this.buildQuery();
      const result = await this.svc.getAll(q);
      this.result.set(result);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Could not load audit logs.');
    } finally {
      this.loading.set(false);
    }
  }

  private buildQuery(): AuditLogQuery {
    const q: AuditLogQuery = {
      page: this.page(),
      pageSize: this.pageSize(),
    };
    if (this.moduleFilter()) q.module = this.moduleFilter();
    if (this.actionFilter()) q.action = this.actionFilter();
    if (this.statusFilter()) q.status = this.statusFilter();
    if (this.searchTerm()) q.search = this.searchTerm();
    if (this.performedByFilter()) q.performedByEmail = this.performedByFilter();
    if (this.dateFrom()) q.dateFrom = this.dateFrom();
    if (this.dateTo()) q.dateTo = this.dateTo();
    return q;
  }

  /* ── Search with debounce ─────────────────────────────────── */
  onSearchInput(): void {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => { this.page.set(1); void this.load(); }, 400);
  }

  /* ── Apply filters ────────────────────────────────────────── */
  applyFilters(): void {
    const pills: { key: string; label: string }[] = [];
    if (this.moduleFilter()) pills.push({ key: 'module', label: `Module: ${this.moduleFilter()}` });
    if (this.actionFilter()) pills.push({ key: 'action', label: `Action: ${this.actionLabel(this.actionFilter())}` });
    if (this.statusFilter()) pills.push({ key: 'status', label: `Status: ${this.statusFilter()}` });
    if (this.performedByFilter()) pills.push({ key: 'performedBy', label: `By: ${this.performedByFilter()}` });
    if (this.dateFrom()) pills.push({ key: 'dateFrom', label: `From: ${this.dateFrom()}` });
    if (this.dateTo()) pills.push({ key: 'dateTo', label: `To: ${this.dateTo()}` });
    this.activeFilters.set(pills);
    this.page.set(1);
    void this.load();
  }

  clearFilter(key: string): void {
    switch (key) {
      case 'module': this.moduleFilter.set(''); break;
      case 'action': this.actionFilter.set(''); break;
      case 'status': this.statusFilter.set(''); break;
      case 'performedBy': this.performedByFilter.set(''); break;
      case 'dateFrom': this.dateFrom.set(''); break;
      case 'dateTo': this.dateTo.set(''); break;
    }
    this.applyFilters();
  }

  clearAllFilters(): void {
    this.searchTerm.set('');
    this.moduleFilter.set('');
    this.actionFilter.set('');
    this.statusFilter.set('');
    this.performedByFilter.set('');
    this.dateFrom.set('');
    this.dateTo.set('');
    this.activeFilters.set([]);
    this.page.set(1);
    void this.load();
  }

  hasActiveFilters(): boolean {
    return this.activeFilters().length > 0 || this.searchTerm() !== '';
  }

  /* ── Pagination ───────────────────────────────────────────── */
  goToPage(p: number): void {
    if (p < 1 || p > this.totalPages()) return;
    this.page.set(p);
    void this.load();
  }

  pageNumbers(): number[] {
    const tp = this.totalPages();
    const cur = this.page();
    const pages: number[] = [];
    const start = Math.max(1, cur - 2);
    const end = Math.min(tp, cur + 2);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }

  /* ── Detail drawer ────────────────────────────────────────── */
  viewDetails(log: AuditLog): void {
    this.selectedLog.set(log);
    this.jsonViewMode.set('split');
  }

  closeDrawer(): void {
    this.selectedLog.set(null);
  }

  /* ── JSON tree helpers ────────────────────────────────────── */
  parseJson(data: string | null): unknown {
    if (!data) return null;
    try { return JSON.parse(data); } catch { return null; }
  }

  /* ── Helpers ──────────────────────────────────────────────── */
  actionLabel(action: string): string {
    return ACTION_LABELS[action] || action;
  }

  badgeClass(action: string): string {
    const lower = action.toLowerCase();
    if (lower === 'create' || lower === 'login') return 'al-badge--create';
    if (lower === 'update') return 'al-badge--update';
    if (lower === 'delete' || lower === 'bulkdelete') return 'al-badge--delete';
    if (lower === 'logout') return 'al-badge--logout';
    if (lower === 'permissionchange') return 'al-badge--permission';
    if (lower === 'reorder') return 'al-badge--reorder';
    if (lower === 'stockmovement') return 'al-badge--movement';
    if (lower.startsWith('bulk')) return 'al-badge--bulk';
    if (lower === 'bulklaunch') return 'al-badge--launch';
    return 'al-badge--update';
  }

  statusBadgeClass(status: string): string {
    return status === 'Success' ? 'al-badge--success' : 'al-badge--failure';
  }

  timelineBadgeClass(action: string): string {
    const lower = action.toLowerCase();
    if (lower === 'create') return 'al-timeline-badge--create';
    if (lower === 'update') return 'al-timeline-badge--update';
    if (lower === 'delete') return 'al-timeline-badge--delete';
    if (lower === 'permissionchange') return 'al-timeline-badge--permission';
    return 'al-timeline-badge--update';
  }

  isPriceUpdate(action: string, description: string): boolean {
    return action === 'Update' && description.toLowerCase().includes('price');
  }

  isInventoryUpdate(action: string, description: string): boolean {
    return action === 'Update' && (description.toLowerCase().includes('stock') || description.toLowerCase().includes('inventory'));
  }

  /* ── Export ───────────────────────────────────────────────── */
  exportCsv(): void {
    const q = this.buildQuery();
    const params = new URLSearchParams();
    Object.entries(q).forEach(([k, v]) => { if (v !== undefined && v !== '' && v !== null) params.set(k, String(v)); });
    params.set('pageSize', '999999');
    params.set('page', '1');
    window.open(`${(this as any).constructor.name}?${params.toString()}`, '_blank');
    // In real usage: window.open(`${environment.apiBaseUrl}/audit-logs/export?${params}`);
  }

  async exportExcel(): Promise<void> {
    try {
      const XLSX = await import('xlsx');
      const r = this.result();
      if (!r || r.items.length === 0) return;
      const rows = r.items.map(log => ({
        Timestamp: log.performedAt,
        Action: this.actionLabel(log.action),
        Module: log.module,
        'Entity Name': log.entityName || '',
        Description: log.description,
        'Performed By': log.performedByEmail || log.performedByName || '',
        Status: log.status,
        'IP Address': log.ipAddress || '',
        Browser: log.browser || '',
        'Correlation ID': log.correlationId || '',
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Audit Logs');
      const today = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(wb, `audit-logs-${today}.xlsx`);
    } catch {
      this.error.set('Excel export failed.');
    }
  }

  exportPdf(): void {
    window.print();
  }

}
