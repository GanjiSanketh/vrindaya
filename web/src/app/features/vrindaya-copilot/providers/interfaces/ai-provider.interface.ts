export interface IAIProvider {
  executePrompt(prompt: string): Promise<string>;
  generateCampaign(request: CampaignRequest): Promise<CampaignResponse>;
  isAvailable(): Promise<boolean>;
  getProviderName(): string;
}

export interface CampaignRequest {
  objective: string;
  targetAudience: string;
  channels: string[];
  budget?: number;
  duration?: number;
}

export interface CampaignResponse {
  id: string;
  name: string;
  content: CampaignContent;
  metadata: CampaignMetadata;
}

export interface CampaignContent {
  headlines: string[];
  descriptions: string[];
  callsToAction: string[];
  hashtags: string[];
}

export interface CampaignMetadata {
  provider: string;
  model: string;
  generatedAt: Date;
  tokensUsed?: number;
}