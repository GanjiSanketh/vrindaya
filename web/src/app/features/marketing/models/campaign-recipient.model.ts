import type { Timestamp } from 'firebase/firestore';

/**
 * Matches the Execution Details page's filter pills exactly. Deliberately
 * its own vocabulary (not QueueStatus's PENDING/PROCESSING) — this
 * collection belongs to the execution engine (campaignExecutions), not the
 * older campaignQueue pipeline, and its statuses mirror CampaignExecution's
 * own QUEUED/... naming for consistency within that engine.
 */
export const RECIPIENT_STATUSES = ['QUEUED', 'SENDING', 'SENT', 'DELIVERED', 'READ', 'FAILED'] as const;
export type RecipientStatus = (typeof RECIPIENT_STATUSES)[number];

export interface CampaignRecipient {
  /** Firestore document ID — this collection's "recipientId". */
  id: string;

  executionId: string;
  campaignId: string;

  /** The marketingSubscribers document ID (the mobile number) this recipient was snapshotted from. */
  subscriberId: string;

  /**
   * Snapshotted from the subscriber at creation time — deliberately NOT a
   * live reference. If the subscriber later changes their name or opts
   * out, this campaign's recipient record is unaffected, by design.
   */
  name?: string;
  phoneNumber: string;

  status: RecipientStatus;

  /** Meta's WhatsApp message ID, set only once the batch-sending worker (next phase) actually sends. */
  messageId?: string;

  errorMessage?: string;

  /** 0 until the batch-sending worker (next phase) makes its first send attempt. */
  attempts: number;

  queuedAt: Timestamp;
  sentAt: Timestamp | null;
  deliveredAt: Timestamp | null;
  readAt: Timestamp | null;
  failedAt: Timestamp | null;
  updatedAt: Timestamp;
}
