export interface CampaignRequest {
  preferredObjective?: string;
  platform?: CampaignPlatform;
  maximumCampaigns?: number;
  includeLowStock?: boolean;
  includeNewProducts?: boolean;
  includeBestSellers?: boolean;
  festivalName?: string;
  targetAudience?: string;
  tone?: string;
  language?: string;
}

export type CampaignPlatform = 
  | 'instagram' 
  | 'facebook' 
  | 'twitter' 
  | 'linkedin' 
  | 'pinterest' 
  | 'tiktok' 
  | 'youtube'
  | 'whatsApp'
  | 'sms'
  | 'email';