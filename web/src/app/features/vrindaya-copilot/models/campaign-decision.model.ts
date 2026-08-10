export interface CampaignDecision {
  productId: string;
  campaignObjective: string;
  reason: string;
  priority: CampaignPriority;
  platform: CampaignPlatform;
  score: number;
  confidence: number;
  expectedROI: number;
  estimatedRevenue: number;
}

export type CampaignPriority = 'low' | 'medium' | 'high' | 'critical';

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