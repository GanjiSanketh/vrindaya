import { ICampaignStrategy } from './campaign-strategy.interface';
import { CampaignDecision } from '../models/campaign-decision.model';
import { CampaignPlatform } from '../models/campaign-model';
import { CampaignPriority } from '../models/campaign-decision.model';

export class FestivalCampaignStrategy implements ICampaignStrategy {
  canHandle(data: any): boolean {
    if (!data) return false;
    
    const {
      festivalName,
      targetAudience,
      platform,
      season,
      productId,
      productName,
    } = data;
    
    const validFestivals = [
      'Diwali', 'Holi', 'Navratri', 'Eid', 'Christmas', 
      'Republic Day', 'Independence Day', 'Ganesh Chaturthi', 
      'Deepavali', 'Dussehra', 'Pongal', 'Onam'
    ];
    
    const validSeasons = [
      'Festive', 'Diwali', 'Eid', 'Christmas', 
      'Spring', 'Summer', 'Monsoon', 'Autumn'
    ];
    
    const isFestival = !!festivalName && validFestivals.includes(festivalName);
    const isSeason = !!season && validSeasons.includes(season);
    const hasPlatform = !!platform;
    const hasTarget = !!targetAudience;
    
    return isFestival || isSeason || hasPlatform || hasTarget || !!productId || !!productName;
  }

  generate(data: any): CampaignDecision {
    const {
      festivalName,
      targetAudience,
      platform = 'instagram',
      season = 'Festive',
      productId,
      productName,
      score = 85,
      confidence = 0.90,
      expectedROI = 0.22,
      estimatedRevenue = 75000,
    } = data;
    
    const isFestival = !!festivalName;
    
    if (isFestival) {
      return {
        productId: productId || `product-${Date.now()}`,
        campaignObjective: 'FestivalPromotion',
        reason: `Festival campaign detected for ${festivalName} - promoting ${productName || 'products'} via ${platform}`,
        priority: 'critical' as CampaignPriority,
        platform: platform as CampaignPlatform,
        score,
        confidence,
        expectedROI,
        estimatedRevenue: estimatedRevenue * 1.5,
      };
    }
    
    return {
      productId: productId || `product-${Date.now()}`,
      campaignObjective: `Festival campaign targeting ${targetAudience || 'all customers'} for ${productName || 'products'} with ${season} focus`,
      reason: `Festival/seasonal opportunity detected: ${season} - targeting ${targetAudience || 'all customers'} via ${platform}`,
      priority: score >= 85 
        ? 'critical' 
        : score >= 75 
        ? 'high' 
        : score >= 65 
        ? 'medium' 
        : 'low' as CampaignPriority,
      platform: platform as CampaignPlatform,
      score,
      confidence,
      expectedROI,
      estimatedRevenue,
    };
  }
}