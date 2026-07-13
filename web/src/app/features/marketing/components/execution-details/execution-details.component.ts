import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import type { Timestamp } from 'firebase/firestore';
import { CampaignExecutionService } from '../../services/campaign-execution.service';
import { CampaignRecipientService, RecipientStatusFilter } from '../../services/campaign-recipient.service';
import { ToastService } from '../../../../shared/services/toast.service';
import { APP_ROUTES } from '../../../../core/constants/routes.constants';
import { RECIPIENT_STATUSES } from '../../models/campaign-recipient.model';
import { formatDateTime } from '../../../../shared/utils/date-format.util';

/**
 * Route: campaigns/:id/execution/recipients — :id is the campaignId, same
 * resolution pattern as ExecutionProgressComponent (reuses
 * CampaignExecutionService.fetchLatestExecutionForCampaign rather than
 * duplicating the lookup).
 */
@Component({
  selector:    'app-execution-details',
  standalone:  true,
  imports:     [RouterLink],
  templateUrl: './execution-details.component.html',
  styleUrl:    './execution-details.component.css',
})
export class ExecutionDetailsComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);
  private readonly executionSvc = inject(CampaignExecutionService);
  readonly recipientSvc = inject(CampaignRecipientService);

  readonly BASE = `/${APP_ROUTES.ADMIN}/campaigns`;
  readonly statusFilters: readonly RecipientStatusFilter[] = ['ALL', ...RECIPIENT_STATUSES];

  readonly resolving   = signal(true);
  readonly notFound    = signal(false);
  readonly campaignId  = signal('');
  readonly executionId = signal('');
  readonly activeFilter = signal<RecipientStatusFilter>('ALL');
  readonly searchTerm   = signal('');
  readonly expandedId   = signal<string | null>(null);

  /** Search only covers recipients already loaded — see the hint shown when more pages remain. */
  readonly filteredRecipients = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const all = this.recipientSvc.recipients();
    if (!term) return all;
    return all.filter(r => (r.name?.toLowerCase().includes(term) ?? false) || r.phoneNumber.includes(term));
  });

  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.notFound.set(true);
      this.resolving.set(false);
      return;
    }
    this.campaignId.set(id);

    try {
      const execution = await this.executionSvc.fetchLatestExecutionForCampaign(id);
      if (!execution) {
        this.notFound.set(true);
        return;
      }
      this.executionId.set(execution.id);
      await this.recipientSvc.loadFirstPage(execution.id, 'ALL');
    } catch (err) {
      this.toast.error(err instanceof Error ? err.message : 'Failed to load recipients.');
      this.notFound.set(true);
    } finally {
      this.resolving.set(false);
    }
  }

  ngOnDestroy(): void {
    this.recipientSvc.reset();
  }

  async setFilter(filter: RecipientStatusFilter): Promise<void> {
    if (filter === this.activeFilter() || !this.executionId()) return;
    this.activeFilter.set(filter);
    this.expandedId.set(null);
    await this.recipientSvc.loadFirstPage(this.executionId(), filter);
  }

  loadMore(): void {
    void this.recipientSvc.loadMore();
  }

  toggleExpand(id: string): void {
    this.expandedId.set(this.expandedId() === id ? null : id);
  }

  onSearchInput(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
  }

  filterLabel(filter: RecipientStatusFilter): string {
    if (filter === 'ALL') return 'All';
    return filter.charAt(0) + filter.slice(1).toLowerCase();
  }

  formatDateTime(ts: Timestamp | null | undefined): string {
    return formatDateTime(ts);
  }
}
