import { ICampaignStrategy } from './campaign-strategy.interface';
import { CampaignDecision } from '../models/campaign-decision.model';
import { CampaignPlatform } from '../models/campaign-model';
import { CampaignPriority } from '../models/campaign-decision.model';

export class LaunchCampaignStrategy implements ICampaignStrategy {
  canHandle(data: any): boolean {
    if (!data) return false;
    
    const {
      productId,
      festivalName,
      targetAudience,
      platform,
      productName,
      season,
    } = data;
    
    if (!productId && !productName) return false;
    
    const hasFestival = !!festivalName;
    const hasSeasonal = !!season;
    
    const validPlatforms: CampaignPlatform[] = [
      'instagram', 'facebook', 'twitter', 'linkedin', 
      'pinterest', 'tiktok', 'youtube', 'whatsApp', 'sms', 'email'
    ];
    
    return hasFestival || hasSeasonal || 
           validPlatforms.includes(platform as CampaignPlatform) ||
           !!targetAudience;
  }

  generate(data: any): CampaignDecision {
    const {
      productId,
      productName,
      festivalName,
      targetAudience,
      platform = 'instagram',
      productAge,
      season,
      score = 85,
      confidence = 0.90,
      expectedROI = 0.20,
      estimatedRevenue = 75000,
    } = data;
    
    const isNewProduct = productAge !== undefined && productAge < 30;
    
    if (isNewProduct) {
      return {
        productId: productId || `product-${Date.now()}`,
        campaignObjective: 'LaunchProduct',
        reason: `New product launched ${productAge} days ago - immediate launch campaign via ${platform}`,
        priority: 'critical' as CampaignPriority,
        platform: 'MultiPlatform' as CampaignPlatform,
        score,
        confidence,
        expectedROI,
        estimatedRevenue: estimatedRevenue * 1.5,
      };
    }
    
    return {
      productId: productId || `product-${Date.now()}`,
      campaignObjective: `Product launch campaign for ${productName || 'Product'} during ${festivalName || season || 'Festive Season'}`,
      reason: `Product launch campaign for ${productName || 'Product'} targeting ${targetAudience || 'premium customers'} via ${platform}`,
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