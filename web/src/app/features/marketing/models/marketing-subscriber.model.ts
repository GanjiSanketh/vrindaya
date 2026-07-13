import type { Timestamp } from 'firebase/firestore';

/** Matches a 10-digit Indian mobile number starting with 6, 7, 8 or 9. */
export const MOBILE_NUMBER_PATTERN = /^[6-9]\d{9}$/;

/**
 * Document schema: marketingSubscribers/{mobileNumber}
 *
 * The document ID is always the subscriber's mobile number — auto-ID
 * documents are never used for this collection.
 */
export interface MarketingSubscriber {
  mobileNumber: string;
  firstName?: string;
  source: string;
  status: 'ACTIVE';
  consent: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface MarketingSubscribeInput {
  mobileNumber: string;
  firstName?: string;
  consent: boolean;
  source: string;
}

export type SubscribeResult = 'subscribed' | 'duplicate';
