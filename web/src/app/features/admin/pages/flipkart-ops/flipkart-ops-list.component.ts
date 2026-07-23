import { Component, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductApiService } from '../../../../core/services/product-api.service';
import { Product } from '../../../../core/models/product.model';
import { LIFECYCLE_STAGES, LifecycleStageValue } from '../../../../core/constants/lifecycle-stage.constants';
import { FlipkartOpsEditModalComponent } from './flipkart-ops-edit-modal.component';
import { BulkFlipkartUrlModalComponent } from './bulk-flipkart-url-modal.component';

type SortField = 'name' | 'lifecycleStage' | 'launchDate' | 'websiteClickCount';
type LifecycleStageFilter = 'all' | LifecycleStageValue;

@Component({
  selector:    'app-flipkart-ops-list',
  standalone:  true,
  imports:     [CommonModule, FlipkartOpsEditModalComponent, BulkFlipkartUrlModalComponent],
  templateUrl: './flipkart-ops-list.component.html',
  styleUrl:    './flipkart-ops-list.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FlipkartOpsListComponent {
  private readonly _sortField = signal<SortField>('name');

  readonly api = inject(ProductApiService);
  readonly stages = LIFECYCLE_STAGES;

  readonly searchQuery        = signal('');
  readonly lifecycleStageFilter = signal<LifecycleStageFilter>('all');
  readonly missingUrlOnly      = signal(false);
  readonly missingImagesOnly   = signal(false);
  readonly missingSeoOnly      = signal(false);
  readonly sortField           = this._sortField.asReadonly();
  readonly sortAsc             = signal(true);

  readonly selectedIds = signal<Set<string>>(new Set());
  readonly bulkBusy    = signal(false);
  readonly bulkStageChoice = signal<LifecycleStageValue>('Ready For Flipkart');
  readonly bulkLaunchDate   = signal('');

  readonly editingId       = signal<string | null>(null);
  readonly bulkUrlModalOpen = signal(false);

  readonly pageIndex = signal(0);
  readonly pageSize  = 25;

  private readonly notDeleted = computed(() => this.api.products().filter(p => !p.deleted));

  readonly totalCount = computed(() => this.notDeleted().length);

  readonly filteredProducts = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const stage = this.lifecycleStageFilter();
    const sf = this.sortField();

    let list = this.notDeleted().filter(p => {
      const matchQ = !q
        || p.name.toLowerCase().includes(q)
        || p.sku.toLowerCase().includes(q)
        || (p.flipkartSellerSku ?? '').toLowerCase().includes(q)
        || (p.flipkartFsn ?? '').toLowerCase().includes(q);
      const matchStage = stage === 'all' || p.lifecycleStage === stage;
      const matchMissing = (!this.missingUrlOnly() || !p.flipkartProductUrl)
        && (!this.missingImagesOnly() || p.images.length === 0)
        && (!this.missingSeoOnly() || !p.seoTitle || !p.seoDescription);
      return matchQ && matchStage && matchMissing;
    });

    list = [...list].sort((a, b) => {
      let cmp = 0;
      if (sf === 'name') cmp = a.name.localeCompare(b.name);
      else if (sf === 'lifecycleStage') cmp = a.lifecycleStage.localeCompare(b.lifecycleStage);
      else if (sf === 'launchDate') cmp = (a.launchDate ? new Date(a.launchDate).getTime() : 0) - (b.launchDate ? new Date(b.launchDate).getTime() : 0);
      else cmp = a.websiteClickCount - b.websiteClickCount;
      return this.sortAsc() ? cmp : -cmp;
    });

    return list;
  });

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.filteredProducts().length / this.pageSize)));

  readonly pagedProducts = computed(() => {
    const start = this.pageIndex() * this.pageSize;
    return this.filteredProducts().slice(start, start + this.pageSize);
  });

  readonly selectedCount = computed(() => this.selectedIds().size);
  readonly selectedIdsArray = computed(() => [...this.selectedIds()]);
  readonly allVisibleSelected = computed(() => {
    const visible = this.pagedProducts();
    return visible.length > 0 && visible.every(p => this.selectedIds().has(p.id));
  });

  constructor() {
    this.api.ensureLoaded();
  }

  resetFiltersAndPage(): void {
    this.pageIndex.set(0);
    this.clearSelection();
  }

  setSort(field: SortField): void {
    if (this._sortField() === field) { this.sortAsc.update(v => !v); }
    else { this._sortField.set(field); this.sortAsc.set(true); }
  }

  nextPage(): void { this.pageIndex.update(i => Math.min(i + 1, this.totalPages() - 1)); }
  prevPage(): void { this.pageIndex.update(i => Math.max(i - 1, 0)); }

  /* ── Selection ── */

  toggleSelect(id: string): void {
    this.selectedIds.update(set => {
      const next = new Set(set);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  toggleSelectAllVisible(): void {
    const visible = this.pagedProducts().map(p => p.id);
    const allSelected = this.allVisibleSelected();
    this.selectedIds.update(set => {
      const next = new Set(set);
      visible.forEach(id => allSelected ? next.delete(id) : next.add(id));
      return next;
    });
  }

  clearSelection(): void { this.selectedIds.set(new Set()); }

  /* ── Bulk actions ── */

  async bulkUpdateStage(): Promise<void> {
    const ids = [...this.selectedIds()];
    if (!ids.length) return;
    this.bulkBusy.set(true);
    try {
      await this.api.bulkUpdateLifecycleStage(ids, this.bulkStageChoice());
      this.clearSelection();
    } finally {
      this.bulkBusy.set(false);
    }
  }

  async bulkArchive(): Promise<void> {
    const ids = [...this.selectedIds()];
    if (!ids.length) return;
    this.bulkBusy.set(true);
    try {
      await this.api.bulkArchive(ids);
      this.clearSelection();
    } finally {
      this.bulkBusy.set(false);
    }
  }

  async bulkLaunch(): Promise<void> {
    const ids = [...this.selectedIds()];
    if (!ids.length) return;
    this.bulkBusy.set(true);
    try {
      const date = this.bulkLaunchDate() || undefined;
      await this.api.bulkLaunch(ids, date ? new Date(date).toISOString() : undefined);
      this.clearSelection();
      this.bulkLaunchDate.set('');
    } finally {
      this.bulkBusy.set(false);
    }
  }

  openBulkUrlModal(): void {
    if (this.selectedCount() === 0) return;
    this.bulkUrlModalOpen.set(true);
  }

  closeBulkUrlModal(): void {
    this.bulkUrlModalOpen.set(false);
    this.clearSelection();
  }

  /* ── Row actions ── */

  editFlipkartInfo(id: string): void { this.editingId.set(id); }
  closeEditModal(): void { this.editingId.set(null); }

  isLaunched(p: Product): boolean { return !!p.launchDate; }

  /** e.g. "Ready For Flipkart" -> "readyforflipkart", for the status-pill--* CSS class. */
  statusClass(status: string): string {
    return status.toLowerCase().replace(/\s+/g, '');
  }

  trackById(_: number, p: Product): string { return p.id; }
}
