import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ProductListingService } from '../../../services/product-listing.service';
import { ProductListing, LISTING_STATUSES, LISTING_QUALITIES, SYNC_STATUSES, MARKETPLACE_OPTIONS, BulkUpdateListingStatusRequest } from '../../../models/product-listing.model';
import { APP_ROUTES } from '../../../../../core/constants/routes.constants';

@Component({
  selector: 'app-product-listings',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './product-listings.component.html',
  styleUrl: './product-listings.component.css',
})
export class ProductListingsComponent {
  private readonly svc = inject(ProductListingService);
  readonly BASE = `/${APP_ROUTES.ADMIN}/marketplace`;

  readonly listings = signal<ProductListing[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly success = signal<string | null>(null);
  readonly hasNext = signal(false);
  readonly hasPrevious = signal(false);

  readonly searchQuery = signal('');
  readonly marketplaceFilter = signal('');
  readonly statusFilter = signal('');
  readonly qualityFilter = signal('');
  readonly syncFilter = signal('');

  readonly selectedIds = signal<ReadonlySet<string>>(new Set());
  readonly bulkStatus = signal('Draft');
  readonly bulkSaving = signal(false);

  readonly editingId = signal<string | null>(null);
  readonly editStatus = signal('Draft');
  readonly editQuality = signal('');
  readonly editFlipkartId = signal('');
  readonly editPrice = signal(0);
  readonly editInventory = signal(0);
  readonly editSyncStatus = signal('');
  readonly editSaving = signal(false);
  readonly editError = signal<string | null>(null);

  readonly statuses = LISTING_STATUSES;
  readonly qualities = LISTING_QUALITIES;
  readonly syncStatuses = SYNC_STATUSES;
  readonly marketplaces = MARKETPLACE_OPTIONS;

  private currentCursor: string | null = null;
  private nextCursor: string | null = null;
  private history: (string | null)[] = [];

  constructor() { void this.load(); }

  readonly isSelected = (id: string) => this.selectedIds().has(id);
  readonly allVisibleSelected = () => this.listings().length > 0 && this.listings().every(l => this.isSelected(l.id));

  toggleAllVisible(checked: boolean): void {
    const selected = new Set(this.selectedIds());
    for (const l of this.listings()) checked ? selected.add(l.id) : selected.delete(l.id);
    this.selectedIds.set(selected);
  }

  toggleListing(id: string, checked: boolean): void {
    const selected = new Set(this.selectedIds());
    checked ? selected.add(id) : selected.delete(id);
    this.selectedIds.set(selected);
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    this.success.set(null);
    this.selectedIds.set(new Set());
    try {
      const page = await this.svc.getListings({
        search: this.searchQuery() || undefined,
        marketplace: this.marketplaceFilter() || undefined,
        listingStatus: this.statusFilter() || undefined,
        listingQuality: this.qualityFilter() || undefined,
        syncStatus: this.syncFilter() || undefined,
        cursor: this.currentCursor ?? undefined,
      });
      this.listings.set(page.items);
      this.nextCursor = page.nextCursor;
      this.hasNext.set(!!page.nextCursor);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Could not load listings.');
    } finally {
      this.loading.set(false);
    }
  }

  async search(): Promise<void> {
    this.currentCursor = null;
    this.nextCursor = null;
    this.history = [];
    this.hasPrevious.set(false);
    await this.load();
  }

  setMarketplaceFilter(value: string): void {
    this.marketplaceFilter.set(value);
    this.currentCursor = null;
    this.history = [];
    this.hasPrevious.set(false);
    void this.load();
  }

  setStatusFilter(value: string): void {
    this.statusFilter.set(value);
    this.currentCursor = null;
    this.history = [];
    this.hasPrevious.set(false);
    void this.load();
  }

  setQualityFilter(value: string): void {
    this.qualityFilter.set(value);
    this.currentCursor = null;
    this.history = [];
    this.hasPrevious.set(false);
    void this.load();
  }

  setSyncFilter(value: string): void {
    this.syncFilter.set(value);
    this.currentCursor = null;
    this.history = [];
    this.hasPrevious.set(false);
    void this.load();
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

  async applyBulkStatus(): Promise<void> {
    const listingIds = [...this.selectedIds()];
    if (listingIds.length === 0) { this.error.set('Select at least one listing first.'); return; }

    this.bulkSaving.set(true);
    this.error.set(null);
    this.success.set(null);
    try {
      await this.svc.bulkUpdateStatus({ listingIds, listingStatus: this.bulkStatus() });
      await this.load();
      this.success.set(`Status updated to "${this.bulkStatus()}" for ${listingIds.length} listing${listingIds.length === 1 ? '' : 's'}.`);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Could not update listings.');
    } finally {
      this.bulkSaving.set(false);
    }
  }

  startEdit(listing: ProductListing): void {
    this.editingId.set(listing.id);
    this.editStatus.set(listing.listingStatus);
    this.editQuality.set(listing.listingQuality);
    this.editFlipkartId.set(listing.flipkartListingId ?? '');
    this.editPrice.set(listing.marketplacePrice);
    this.editInventory.set(listing.inventory);
    this.editSyncStatus.set(listing.syncStatus);
    this.editError.set(null);
  }

  cancelEdit(): void {
    this.editingId.set(null);
    this.editError.set(null);
  }

  async saveEdit(listing: ProductListing): Promise<void> {
    this.editSaving.set(true);
    this.editError.set(null);
    try {
      await this.svc.updateListing(listing.id, {
        listingStatus: this.editStatus(),
        listingQuality: this.editQuality() || undefined,
        flipkartListingId: this.editFlipkartId()?.trim() || undefined,
        marketplacePrice: this.editPrice(),
        inventory: this.editInventory(),
        syncStatus: this.editSyncStatus() || undefined,
      });
      this.editingId.set(null);
      this.success.set('Listing updated.');
      await this.load();
    } catch (err) {
      this.editError.set(err instanceof Error ? err.message : 'Could not update listing.');
    } finally {
      this.editSaving.set(false);
    }
  }

  formatCurrency(value: number): string { return `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`; }
  formatDate(value: string | null): string {
    if (!value) return '—';
    return new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }
}
