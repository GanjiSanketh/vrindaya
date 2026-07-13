import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import type { Timestamp } from 'firebase/firestore';
import { CampaignQueueService } from '../../services/campaign-queue.service';
import { QUEUE_STATUSES, QueueStatus } from '../../models/campaign-queue.model';
import { formatDateTime } from '../../../../shared/utils/date-format.util';

type FilterOption = 'ALL' | QueueStatus;

@Component({
  selector:    'app-campaign-queue-list',
  standalone:  true,
  imports:     [],
  templateUrl: './campaign-queue-list.component.html',
  styleUrl:    './campaign-queue-list.component.css',
})
export class CampaignQueueListComponent implements OnInit, OnDestroy {
  readonly svc = inject(CampaignQueueService);

  readonly statuses = QUEUE_STATUSES;
  readonly filter    = signal<FilterOption>('ALL');

  readonly filteredItems = computed(() => {
    const f = this.filter();
    return f === 'ALL' ? this.svc.queueItems() : this.svc.queueItems().filter(q => q.status === f);
  });

  ngOnInit(): void { this.svc.getQueue(); }
  ngOnDestroy(): void { this.svc.stopListening(); }

  setFilter(f: FilterOption): void {
    this.filter.set(f);
  }

  formatDateTime(ts: Timestamp | null | undefined): string {
    return formatDateTime(ts);
  }
}
