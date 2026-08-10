export interface CampaignResponse {
  campaigns: CampaignModel[];
  generatedAt: Date;
  generationTime: string;
  totalProductsAnalyzed: number;
  totalCampaigns: number;
}

export interface CampaignModel {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly objective: string;
  readonly priority: CampaignPriority;
  readonly platform: CampaignPlatform;
  readonly status: CampaignStatus;
  readonly productIds: readonly string[];
  readonly reason?: string;
  readonly estimatedReach?: number;
  readonly estimatedSales?: number;
  readonly estimatedConversions?: number;
  readonly createdAt: Date;
  readonly generatedBy: string;
  readonly confidenceScore?: number;
  readonly expectedROI?: number;
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

export type CampaignStatus = 'draft' | 'active' | 'paused' | 'completed' | 'cancelled';