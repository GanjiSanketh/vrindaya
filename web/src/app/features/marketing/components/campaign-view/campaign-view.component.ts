import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink, Router, ActivatedRoute } from '@angular/router';
import type { Timestamp } from 'firebase/firestore';
import { CampaignService } from '../../services/campaign.service';
import { ToastService } from '../../../../shared/services/toast.service';
import { APP_ROUTES } from '../../../../core/constants/routes.constants';
import { Campaign } from '../../models/campaign.model';
import { MediaPreviewComponent } from '../media-preview/media-preview.component';
import { formatDateTime } from '../../../../shared/utils/date-format.util';

@Component({
  selector:    'app-campaign-view',
  standalone:  true,
  imports:     [RouterLink, MediaPreviewComponent],
  templateUrl: './campaign-view.component.html',
  styleUrl:    './campaign-view.component.css',
})
export class CampaignViewComponent implements OnInit {
  private readonly route  = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toast  = inject(ToastService);
  readonly svc              = inject(CampaignService);

  readonly BASE = `/${APP_ROUTES.ADMIN}/campaigns`;

  readonly campaign = signal<Campaign | null>(null);
  readonly loading  = signal(true);
  readonly cancelling = signal(false);

  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.router.navigate([this.BASE]);
      return;
    }

    try {
      const campaign = this.svc.getCachedCampaign(id) ?? await this.svc.fetchCampaign(id);
      if (!campaign) {
        this.toast.error('Campaign not found.');
        this.router.navigate([this.BASE]);
        return;
      }
      this.campaign.set(campaign);
    } catch (err) {
      this.toast.error(err instanceof Error ? err.message : 'Failed to load campaign.');
    } finally {
      this.loading.set(false);
    }
  }

  async cancel(): Promise<void> {
    const c = this.campaign();
    if (!c || !confirm('Cancel this campaign? It will no longer send.')) return;

    this.cancelling.set(true);
    try {
      await this.svc.cancelCampaign(c.id);
      this.campaign.set({ ...c, status: 'CANCELLED' });
      this.toast.success('Campaign cancelled.');
    } catch (err) {
      this.toast.error(err instanceof Error ? err.message : 'Failed to cancel campaign.');
    } finally {
      this.cancelling.set(false);
    }
  }

  formatDateTime(ts: Timestamp | null | undefined): string {
    return formatDateTime(ts);
  }
}
