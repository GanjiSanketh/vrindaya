import { CampaignDecision } from '../models/campaign-decision.model';

export interface ICampaignStrategy {
  canHandle(data: any): boolean;
  generate(data: any): CampaignDecision;
}