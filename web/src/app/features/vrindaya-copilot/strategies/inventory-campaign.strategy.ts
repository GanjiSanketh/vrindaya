import { ICampaignStrategy } from './campaign-strategy.interface';
import { CampaignDecision } from '../models/campaign-decision.model';
import { CampaignPlatform } from '../models/campaign-model';
import { CampaignPriority } from '../models/campaign-decision.model';

export class InventoryCampaignStrategy implements ICampaignStrategy {
  canHandle(data: any): boolean {
    if (!data) return false;
    
    const {
      stockStatus,
      inventoryLevel,
      targetAudience,
      platform,
      lowStockThreshold,
    } = data;
    
    const hasLowStock = inventoryLevel !== undefined && 
                       (lowStockThreshold === undefined || inventoryLevel <= lowStockThreshold);
    
    const hasStockStatus = !!stockStatus && stockStatus.toLowerCase().includes('low');
    
    const validPlatforms: CampaignPlatform[] = [
      'instagram', 'facebook', 'twitter', 'linkedin', 
      'pinterest', 'tiktok', 'youtube', 'whatsApp', 'sms', 'email'
    ];
    
    return hasLowStock || hasStockStatus || 
           !!targetAudience || 
           validPlatforms.includes(platform as CampaignPlatform);
  }

  generate(data: any): CampaignDecision {
    const {
      productId,
      stockStatus,
      inventoryLevel,
      targetAudience,
      platform = 'instagram',
      productName,
      lowStockThreshold = 10,
      score = 70,
      confidence = 0.80,
      expectedROI = 0.12,
      estimatedRevenue = 30000,
    } = data;
    
    const isHighStock = inventoryLevel !== undefined && inventoryLevel > lowStockThreshold;
    
    if (isHighStock) {
      return {
        productId: productId || `product-${Date.now()}`,
        campaignObjective: 'ClearInventory',
        reason: `High inventory detected for ${productName || 'Product'} with ${inventoryLevel} units in stock - clearing inventory via ${platform}`,
        priority: 'high' as CampaignPriority,
        platform: platform as CampaignPlatform,
        score,
        confidence,
        expectedROI,
        estimatedRevenue: estimatedRevenue * 1.5,
      };
    }
    
    return {
      productId: productId || `product-${Date.now()}`,
      campaignObjective: `Inventory management campaign for ${productName || 'Product'} targeting ${targetAudience || 'all customers'} via ${platform}`,
      reason: `Inventory situation detected: ${productName || 'Product'} has ${inventoryLevel} units left (${stockStatus || 'unknown status'}) - campaign to manage via ${platform} with ROI of ${expectedROI * 100}%`,
      priority: inventoryLevel !== undefined && inventoryLevel <= lowStockThreshold 
        ? 'critical' 
        : score >= 80 
        ? 'high' 
        : score >= 60 
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