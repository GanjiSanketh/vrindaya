import type { Timestamp } from 'firebase/firestore';

/**
 * Mirrors WhatsApp Business API's own message-status lifecycle, so that
 * once the real API is wired in, webhook callbacks map directly onto these
 * values with no schema change: PENDING → PROCESSING → SENT → DELIVERED →
 * READ, or FAILED at any point.
 */
export const QUEUE_STATUSES = ['PENDING', 'PROCESSING', 'SENT', 'DELIVERED', 'READ', 'FAILED'] as const;
export type QueueStatus = (typeof QUEUE_STATUSES)[number];

export interface CampaignQueueItem {
  id: string;
  campaignId: string;
  campaignName: string;
  mobileNumber: string;
  firstName?: string;
  status: QueueStatus;
  message: string;
  imageUrl?: string;
  buttonUrl?: string;
  failureReason?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
