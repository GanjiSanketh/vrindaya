import { Component, computed, input } from '@angular/core';
import type { Timestamp } from 'firebase/firestore';
import { CampaignExecution } from '../../models/campaign-execution.model';
import { formatDateTime } from '../../../../shared/utils/date-format.util';

/**
 * Presentational only — reusable anywhere an execution needs to be shown
 * (currently the Execution Progress page; a future campaign detail view or
 * an executions list could reuse it without changes).
 */
@Component({
  selector:    'app-execution-progress-card',
  standalone:  true,
  templateUrl: './execution-progress-card.component.html',
  styleUrl:    './execution-progress-card.component.css',
})
export class ExecutionProgressCardComponent {
  readonly execution = input.required<CampaignExecution>();

  readonly percentComplete = computed(() => {
    const e = this.execution();
    return e.totalRecipients === 0 ? 0 : Math.round((e.processedRecipients / e.totalRecipients) * 100);
  });

  formatDateTime(ts: Timestamp | null): string {
    return formatDateTime(ts);
  }
}
