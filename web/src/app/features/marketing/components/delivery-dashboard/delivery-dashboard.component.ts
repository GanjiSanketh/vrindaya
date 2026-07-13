import { Component, OnDestroy, OnInit, computed, inject } from '@angular/core';
import type { Timestamp } from 'firebase/firestore';
import { CampaignQueueService } from '../../services/campaign-queue.service';
import { CampaignService } from '../../services/campaign.service';

@Component({
  selector:    'app-delivery-dashboard',
  standalone:  true,
  imports:     [],
  templateUrl: './delivery-dashboard.component.html',
  styleUrl:    './delivery-dashboard.component.css',
})
export class DeliveryDashboardComponent implements OnInit, OnDestroy {
  readonly queueSvc    = inject(CampaignQueueService);
  readonly campaignSvc = inject(CampaignService);

  readonly recentActivity = computed(() => this.queueSvc.queueItems().slice(0, 12));

  ngOnInit(): void {
    this.queueSvc.getQueue();
    this.campaignSvc.getCampaigns();
  }

  ngOnDestroy(): void {
    this.queueSvc.stopListening();
    this.campaignSvc.stopListening();
  }

  statusIcon(status: string): string {
    switch (status) {
      case 'PENDING':    return 'bi-hourglass-split';
      case 'PROCESSING': return 'bi-arrow-repeat';
      case 'SENT':        return 'bi-send-check';
      case 'DELIVERED':   return 'bi-check2-circle';
      case 'READ':         return 'bi-eye';
      case 'FAILED':       return 'bi-x-circle';
      default:              return 'bi-dot';
    }
  }

  formatDateTime(ts: Timestamp | null | undefined): string {
    if (!ts) return '—';
    return ts.toDate().toLocaleString('en-IN', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
    });
  }
}
