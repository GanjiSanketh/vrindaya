import type { Timestamp } from 'firebase/firestore';

/** QUEUED is the only reachable status until the Meta Cloud API is wired in. */
export type TestMessageStatus = 'QUEUED' | 'SENT' | 'FAILED';

export interface TestMessage {
  id: string;
  campaignId?: string;
  mobileNumber: string;
  message: string;
  imageUrl?: string;
  buttonUrl?: string;
  status: TestMessageStatus;
  createdBy: string;
  createdAt: Timestamp;
}

export interface TestMessageInput {
  campaignId?: string;
  mobileNumber: string;
  message: string;
  imageUrl?: string;
  buttonUrl?: string;
}
