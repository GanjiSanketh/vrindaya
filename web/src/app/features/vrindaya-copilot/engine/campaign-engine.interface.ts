import { CampaignRequest } from '../models/campaign-request.model';
import { CampaignResponse } from '../models/campaign-response.model';

export interface ICampaignEngine {
  generateCampaigns(request: CampaignRequest): Promise<CampaignResponse>;
}