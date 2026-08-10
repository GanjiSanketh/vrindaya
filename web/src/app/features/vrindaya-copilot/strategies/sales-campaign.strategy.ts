import { ICampaignStrategy } from './campaign-strategy.interface';
import { CampaignDecision } from '../models/campaign-decision.model';
import { CampaignPlatform } from '../models/campaign-model';
import { CampaignPriority } from '../models/campaign-decision.model';

export class SalesCampaignStrategy implements ICampaignStrategy {
  canHandle(data: any): boolean {
    if (!data) return false;
    
    const {
      productId,
      salesData,
      revenue,
      targetAudience,
      platform,
      season,
      productName,
    } = data;
    
    const hasSalesData = !!salesData;
    const hasRevenue = revenue !== undefined && revenue > 0;
    const hasSeason = !!season;
    const hasPlatform = !!platform;
    const hasTarget = !!targetAudience;
    
    const validPlatforms: CampaignPlatform[] = [
      'instagram', 'facebook', 'twitter', 'linkedin', 
      'pinterest', 'tiktok', 'youtube', 'whatsApp', 'sms', 'email'
    ];
    
    return hasSalesData || hasRevenue || hasSeason || hasPlatform || hasTarget || !!productId || !!productName;
  }

  generate(data: any): CampaignDecision {
    const {
      productId,
      salesData,
      revenue,
      targetAudience,
      platform = 'instagram',
      season = 'Regular Season',
      productName,
      score = 85,
      confidence = 0.90,
      expectedROI = 0.20,
      estimatedRevenue,
    } = data;
    
    const baselineRevenue = estimatedRevenue || (revenue || 0) * 1.1;
    
    const performanceIndicators = {
      salesData: salesData?.conversion || 2.5,
      revenue: revenue || 100000,
      growth: salesData?.growth || 15,
      season: season.toLowerCase().includes('festival') || season.toLowerCase().includes('diwali') || season.toLowerCase().includes('eid') 
        ? 'HIGH'
        : season.toLowerCase().includes('summer') || season.toLowerCase().includes('monsoon')
        ? 'MEDIUM'
        : 'REGULAR'
    };
    
    const isHighSales = performanceIndicators.growth >= 20 || performanceIndicators.season === 'HIGH';
    
    if (isHighSales) {
      return {
        productId: productId || `product-${Date.now()}`,
        campaignObjective: 'IncreaseSales',
        reason: `High sales performance detected for ${productName || 'Product'} with ${performanceIndicators.growth}% growth and ${performanceIndicators.revenue} revenue - targeting immediate sales expansion via ${platform}`,
        priority: 'high' as CampaignPriority,
        platform: platform as CampaignPlatform,
        score,
        confidence,
        expectedROI,
        estimatedRevenue: baselineRevenue * 1.2,
      };
    }
    
    return {
      productId: productId || `product-${Date.now()}`,
      campaignObjective: `Revenue growth targeting ${performanceIndicators.growth}% for ${productName || 'products'} via ${platform}`,
      reason: `Sales opportunity detected: ${productName || 'Product'} showing ${performanceIndicators.growth}% growth, ${performanceIndicators.revenue} revenue in ${season} - targeting ${targetAudience || 'all customers'} via ${platform}`,
      priority: performanceIndicators.growth >= 15 
        ? 'medium' 
        : 'low' as CampaignPriority,
      platform: platform as CampaignPlatform,
      score,
      confidence,
      expectedROI,
      estimatedRevenue: baselineRevenue,
    };
  }
}