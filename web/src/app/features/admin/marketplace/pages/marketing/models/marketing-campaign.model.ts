import type { MarketingTool } from './marketing-platform.model';

export type { MarketingTool };

export interface MarketingCampaign {
  id: string;
  tool: MarketingTool;
  label: string;
  productName: string;
  productId?: string;
  prompt: string;
  result: string;
  tone?: string;
  platform?: string;
  createdAt: string;
}