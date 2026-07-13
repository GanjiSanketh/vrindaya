import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { Timestamp } from 'firebase/firestore';
import { CampaignService } from '../../services/campaign.service';
import { ToastService } from '../../../../shared/services/toast.service';
import { APP_ROUTES } from '../../../../core/constants/routes.constants';
import { CAMPAIGN_MEDIA_TYPE_ICONS, CampaignMediaType } from '../../models/campaign.model';
import { formatShortDate } from '../../../../shared/utils/date-format.util';

@Component({
  selector:    'app-campaign-list',
  standalone:  true,
  imports:     [RouterLink],
  templateUrl: './campaign-list.component.html',
  styleUrl:    './campaign-list.component.css',
})
export class CampaignListComponent implements OnInit, OnDestroy {
  readonly svc  = inject(CampaignService);
  private readonly toast = inject(ToastService);

  readonly BASE = `/${APP_ROUTES.ADMIN}/campaigns`;

  ngOnInit(): void { this.svc.getCampaigns(); }
  ngOnDestroy(): void { this.svc.stopListening(); }

  async cancel(id: string): Promise<void> {
    if (!confirm('Cancel this campaign? It will no longer send.')) return;
    try {
      await this.svc.cancelCampaign(id);
      this.toast.success('Campaign cancelled.');
    } catch (err) {
      this.toast.error(err instanceof Error ? err.message : 'Failed to cancel campaign.');
    }
  }

  async delete(id: string): Promise<void> {
    if (!confirm('Delete this draft campaign? This cannot be undone.')) return;
    try {
      await this.svc.deleteCampaign(id);
      this.toast.success('Draft deleted.');
    } catch (err) {
      this.toast.error(err instanceof Error ? err.message : 'Failed to delete campaign.');
    }
  }

  formatDate(ts: Timestamp | null | undefined): string {
    return formatShortDate(ts);
  }

  mediaTypeIcon(mediaType: CampaignMediaType): string {
    return CAMPAIGN_MEDIA_TYPE_ICONS[mediaType] ?? CAMPAIGN_MEDIA_TYPE_ICONS['Text'];
  }
}
