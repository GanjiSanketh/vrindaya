import type { Timestamp } from 'firebase/firestore';

/**
 * This phase only ever writes QUEUED (see CampaignExecutionService.createExecution).
 * IN_PROGRESS/COMPLETED/FAILED are reserved for the batch-sending worker that
 * will actually drive a campaign through the queue (next phase). CANCELLED
 * mirrors Campaign's own cancellation semantics for consistency.
 */
export const EXECUTION_STATUSES = ['QUEUED', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'CANCELLED'] as const;
export type ExecutionStatus = (typeof EXECUTION_STATUSES)[number];

export interface CampaignExecution {
  /** Firestore document ID — this collection's equivalent of an "executionId". */
  id: string;

  campaignId: string;

  /** Denormalized from Campaign at creation time, same pattern as CampaignQueueItem.campaignName — avoids a join on the progress page. */
  campaignName: string;

  status: ExecutionStatus;

  totalRecipients: number;
  processedRecipients: number;
  successfulRecipients: number;
  failedRecipients: number;

  /** Null until the batch-sending worker actually starts (next phase) — this phase never sets it. */
  startedAt: Timestamp | null;

  /** Null until the batch-sending worker finishes (next phase) — this phase never sets it. */
  completedAt: Timestamp | null;

  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
