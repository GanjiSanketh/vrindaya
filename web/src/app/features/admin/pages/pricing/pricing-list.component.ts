import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { PricingService } from '../../services/pricing.service';
import { AdminAuthService } from '../../services/admin-auth.service';
import { ToastService } from '../../../../shared/services/toast.service';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { PricingRow } from '../../models/pricing.model';
import { APP_ROUTES } from '../../../../core/constants/routes.constants';

@Component({
  selector:    'app-pricing-list',
  standalone:  true,
  imports:     [FormsModule, RouterLink, ConfirmDialogComponent, EmptyStateComponent],
  templateUrl: './pricing-list.component.html',
  styleUrl:    './pricing-list.component.css',
})
export class PricingListComponent {
  private readonly svc     = inject(PricingService);
  private readonly auth    = inject(AdminAuthService);
  private readonly toast   = inject(ToastService);

  readonly BASE = `/${APP_ROUTES.ADMIN}/inventory/pricing`;
  readonly canDelete = this.auth.hasRole(['SuperAdmin', 'Admin']);
  readonly canEdit   = this.auth.hasRole(['SuperAdmin', 'Admin']);

  readonly rows       = signal<PricingRow[]>([]);
  readonly loading    = signal(true);
  readonly error      = signal<string | null>(null);
  readonly hasNext     = signal(false);
  readonly hasPrevious = signal(false);
  readonly exporting   = signal(false);

  readonly searchTerm    = signal('');
  readonly marketplaceFilter = signal('');
  readonly activeFilter  = signal('');
  readonly sortBy        = signal('marketplace');
  readonly sortDescending = signal(false);

  readonly deleteId   = signal<string | null>(null);
  readonly deleting   = signal(false);

  private currentCursor: string | null = null;
  private nextCursor: string | null = null;
  private history: (string | null)[] = [];

  readonly sortFields = [
    { value: 'marketplace', label: 'Marketplace' },
    { value: 'costPrice', label: 'Cost Price' },
    { value: 'listingPrice', label: 'Listing Price' },
    { value: 'actualProfit', label: 'Profit' },
    { value: 'marginPercentage', label: 'Margin %' },
    { value: 'mrp', label: 'MRP' },
    { value: 'updatedAt', label: 'Updated' },
  ];

  constructor() {
    void this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const isActive = this.activeFilter() === '' ? undefined : this.activeFilter() === 'active';
      const page = await this.svc.getAll(
        this.currentCursor, 50,
        this.searchTerm().trim() || undefined,
        this.marketplaceFilter() || undefined,
        isActive,
        undefined,
        this.sortBy(), this.sortDescending(),
      );
      this.rows.set(page.items);
      this.nextCursor = page.nextCursor;
      this.hasNext.set(!!page.nextCursor);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Could not load pricing data.');
    } finally {
      this.loading.set(false);
    }
  }

  async applyFilters(): Promise<void> {
    this.currentCursor = null;
    this.nextCursor = null;
    this.history = [];
    this.hasPrevious.set(false);
    await this.load();
  }

  async changeSort(field: string): Promise<void> {
    if (this.sortBy() === field) {
      this.sortDescending.update(v => !v);
    } else {
      this.sortBy.set(field);
      this.sortDescending.set(false);
    }
    await this.applyFilters();
  }

  async nextPage(): Promise<void> {
    if (!this.hasNext()) return;
    this.history.push(this.currentCursor);
    this.currentCursor = this.nextCursor;
    this.hasPrevious.set(true);
    await this.load();
  }

  async previousPage(): Promise<void> {
    if (this.history.length === 0) return;
    this.currentCursor = this.history.pop() ?? null;
    this.hasPrevious.set(this.history.length > 0);
    await this.load();
  }

  sortIcon(field: string): string {
    if (this.sortBy() !== field) return 'bi-arrow-down-up';
    return this.sortDescending() ? 'bi-sort-down' : 'bi-sort-up';
  }

  // ── Delete ───────────────────────────────────────────────────────

  confirmDelete(id: string): void { this.deleteId.set(id); }
  cancelDelete(): void { this.deleteId.set(null); }

  async doDelete(): Promise<void> {
    const id = this.deleteId();
    if (!id) return;
    this.deleting.set(true);
    try {
      await this.svc.delete(id);
      this.rows.update(list => list.filter(r => r.id !== id));
      this.toast.success('Pricing record deleted successfully.');
    } catch (err) {
      this.toast.error(err instanceof Error ? err.message : 'Delete failed.');
    } finally {
      this.deleting.set(false);
      this.deleteId.set(null);
    }
  }

  // ── Export ────────────────────────────────────────────────────────

  async exportExcel(): Promise<void> {
    this.exporting.set(true);
    try {
      const all = await this.svc.getAllUnpaged();
      if (all.length === 0) { this.toast.info('No data to export.'); return; }
      const XLSX = await import('xlsx');
      const rows = all.map(r => ({
        Variant: r.inventoryVariantId,
        Marketplace: r.marketplace,
        'Cost Price': r.costPrice,
        'Packing Charge': r.packingCharge,
        'Shipping Charge': r.shippingCharge,
        'Advertising Charge': r.advertisingCharge,
        'Marketplace Commission': r.marketplaceCommission,
        'Fixed Fee': r.fixedMarketplaceFee,
        'Payment Gateway': r.paymentGatewayCharge,
        'Other Charges': r.otherCharges,
        'GST %': r.gstPercentage,
        'Desired Profit': r.desiredProfit,
        MRP: r.mrp,
        'Listing Price': r.listingPrice,
        'Offer Price': r.offerPrice ?? '',
        'Suggested Price': r.suggestedSellingPrice,
        Profit: r.actualProfit,
        'Margin %': r.marginPercentage,
        Currency: r.currency,
        Active: r.isActive ? 'Yes' : 'No',
        'Created At': r.createdAt,
        'Updated At': r.updatedAt,
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Pricing');
      XLSX.writeFile(wb, `pricing-export-${new Date().toISOString().slice(0, 10)}.xlsx`);
      this.toast.success('Excel export complete.');
    } catch {
      this.toast.error('Excel export failed.');
    } finally {
      this.exporting.set(false);
    }
  }

  exportPdf(): void {
    window.print();
  }

  formatCurrency(value: number): string {
    return `\u20B9${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }
}
