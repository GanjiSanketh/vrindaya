import { ICampaignStrategy } from './campaign-strategy.interface';
import { CampaignDecision } from '../models/campaign-decision.model';
import { CampaignPlatform } from '../models/campaign-model';
import { CampaignPriority } from '../models/campaign-decision.model';

export class BrandCampaignStrategy implements ICampaignStrategy {
  canHandle(data: any): boolean {
    if (!data) return false;
    
    const {
      brandProfile,
      targetAudience,
      platform,
      brandVoice,
      productId,
      productName,
      season,
    } = data;
    
    const hasBrandProfile = !!brandProfile;
    const hasBrandVoice = !!brandVoice;
    const hasTarget = !!targetAudience;
    const hasPlatform = !!platform;
    const hasSeason = !!season;
    const hasProduct = !!productId || !!productName;
    
    const validPlatforms: CampaignPlatform[] = [
      'instagram', 'facebook', 'twitter', 'linkedin', 
      'pinterest', 'tiktok', 'youtube', 'whatsApp', 'sms', 'email'
    ];
    
    return hasBrandProfile && (hasBrandVoice || hasTarget || hasPlatform || hasSeason || hasProduct);
  }

  generate(data: any): CampaignDecision {
    const {
      brandProfile,
      targetAudience,
      platform = 'instagram',
      brandVoice,
      productId,
      productName,
      season = 'Festive',
      score = 75,
      confidence = 0.80,
      expectedROI = 0.15,
      estimatedRevenue = 50000,
    } = data;
    
    return {
      productId: productId || `product-${Date.now()}`,
      campaignObjective: 'BrandAwareness',
      reason: `Brand campaign opportunity detected: ${brandProfile} with ${brandVoice || 'balanced'} voice for ${productName || 'products'} targeting ${targetAudience || 'all customers'} via ${platform}`,
      priority: 'medium' as CampaignPriority,
      platform: platform as CampaignPlatform,
      score,
      confidence,
      expectedROI,
      estimatedRevenue,
    };
  }
}