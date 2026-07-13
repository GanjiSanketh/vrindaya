import type { Timestamp } from 'firebase/firestore';

export interface CampaignTemplate {
  id: string;
  name: string;
  message: string;
  imageUrl?: string;
  buttonUrl?: string;
  isDefault: boolean;
  createdAt: Timestamp;
}

export interface CampaignTemplateInput {
  name: string;
  message: string;
  imageUrl?: string;
  buttonUrl?: string;
}
