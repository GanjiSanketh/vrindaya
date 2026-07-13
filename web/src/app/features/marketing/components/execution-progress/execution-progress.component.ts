import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CampaignExecutionService } from '../../services/campaign-execution.service';
import { ToastService } from '../../../../shared/services/toast.service';
import { APP_ROUTES } from '../../../../core/constants/routes.constants';
import { ExecutionProgressCardComponent } from '../execution-progress-card/execution-progress-card.component';

/**
 * Route: campaigns/:id/execution — :id is the campaignId, not the
 * executionId. Resolves the latest execution for that campaign, then
 * live-watches it so processedRecipients/status update in real time once
 * the batch-sending worker (next phase) starts writing to the document.
 */
@Component({
  selector:    'app-execution-progress',
  standalone:  true,
  imports:     [RouterLink, ExecutionProgressCardComponent],
  templateUrl: './execution-progress.component.html',
  styleUrl:    './execution-progress.component.css',
})
export class ExecutionProgressComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);
  readonly svc = inject(CampaignExecutionService);

  readonly BASE = `/${APP_ROUTES.ADMIN}/campaigns`;

  readonly resolving  = signal(true);
  readonly notFound   = signal(false);
  readonly campaignId = signal('');

  async ngOnInit(): Promise<void> {
    const campaignId = this.route.snapshot.paramMap.get('id');
    if (!campaignId) {
      this.notFound.set(true);
      this.resolving.set(false);
      return;
    }
    this.campaignId.set(campaignId);

    try {
      const execution = await this.svc.fetchLatestExecutionForCampaign(campaignId);
      if (!execution) {
        this.notFound.set(true);
        return;
      }
      this.svc.watchExecution(execution.id);
    } catch (err) {
      this.toast.error(err instanceof Error ? err.message : 'Failed to load execution.');
      this.notFound.set(true);
    } finally {
      this.resolving.set(false);
    }
  }

  ngOnDestroy(): void {
    this.svc.stopWatchingExecution();
  }
}
