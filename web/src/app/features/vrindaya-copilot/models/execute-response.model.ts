import { CampaignPackage } from './campaign-package.model';

export interface ExecuteCampaignResult {
  id?: string;
  title?: string;
  status?: string;
}

export interface ExecuteTokenUsage {
  input?: number;
  output?: number;
  total?: number;
}

export type ExecuteResponseStatus = 'pending' | 'success' | 'partial' | 'error';

export interface ExecuteResponse {
  conversationId: string;
  response: string;
  campaign?: CampaignPackage | ExecuteCampaignResult;
  tokens?: ExecuteTokenUsage;
  provider?: string;
  executionTime?: number;
  status: ExecuteResponseStatus;
  errors?: string[];
}
