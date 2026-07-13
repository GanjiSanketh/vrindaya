import { Component, OnDestroy, OnInit, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { Timestamp } from 'firebase/firestore';
import { CampaignService } from '../../services/campaign.service';
import { APP_ROUTES } from '../../../../core/constants/routes.constants';
import { formatDateTime } from '../../../../shared/utils/date-format.util';

@Component({
  selector:    'app-campaign-history',
  standalone:  true,
  imports:     [RouterLink],
  templateUrl: './campaign-history.component.html',
  styleUrl:    './campaign-history.component.css',
})
export class CampaignHistoryComponent implements OnInit, OnDestroy {
  readonly svc = inject(CampaignService);

  readonly BASE = `/${APP_ROUTES.ADMIN}/campaigns`;

  readonly historyCampaigns = computed(() =>
    this.svc.campaigns().filter(c => c.status === 'SENT' || c.status === 'CANCELLED'),
  );

  ngOnInit(): void { this.svc.getCampaigns(); }
  ngOnDestroy(): void { this.svc.stopListening(); }

  formatDateTime(ts: Timestamp | null | undefined): string {
    return formatDateTime(ts);
  }
}
