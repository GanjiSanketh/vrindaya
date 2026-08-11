import { ICampaignStrategy } from './campaign-strategy.interface';
import { CampaignDecision } from '../models/campaign-decision.model';
import { CampaignPlatform } from '../models/campaign-model';
import { CampaignPriority } from '../models/campaign-decision.model';

export class AnalyticsCampaignStrategy implements ICampaignStrategy {
  canHandle(data: any): boolean {
    if (!data) return false;
    
    const {
      analyticsGoal,
      metrics,
      targetAudience,
      platform,
      productId,
      productName,
    } = data;
    
    const hasAnalyticsGoal = !!analyticsGoal;
    const hasMetrics = !!metrics && Array.isArray(metrics);
    const hasTarget = !!targetAudience;
    const hasProduct = !!productId || !!productName;
    
    const validPlatforms: CampaignPlatform[] = [
      'instagram', 'facebook', 'twitter', 'linkedin', 
      'pinterest', 'tiktok', 'youtube', 'whatsApp', 'sms', 'email'
    ];
    
    const validAnalyticsGoals = [
      'conversion', 'engagement', 'awareness', 'retention', 
      'revenue', 'growth', 'efficiency'
    ];
    
    return (hasAnalyticsGoal && validAnalyticsGoals.includes(analyticsGoal)) || 
           hasMetrics || 
           validPlatforms.includes(platform as CampaignPlatform) || 
           hasTarget || 
           hasProduct;
  }

  generate(data: any): CampaignDecision {
    const {
      analyticsGoal = 'engagement',
      metrics = ['clicks', 'views', 'shares', 'comments'],
      targetAudience,
      platform = 'instagram',
      productId,
      productName,
      score = 70,
      confidence = 0.75,
      expectedROI = 0.12,
      estimatedRevenue = 35000,
    } = data;
    
    const analyticsGuidelines = {
      conversion: {
        objectives: ['Drive sales', 'Optimize funnel', 'Increase conversion rate'],
        tone: 'Direct and persuasive',
        formats: ['Test', 'A/B test', 'Offer', 'Urgency'],
        metrics: ['CTR', 'CVR', 'ROAS', 'conversion value']
      },
      engagement: {
        objectives: ['Increase interactions', 'Build community', 'Foster loyalty'],
        tone: 'Engaging and conversational',
        formats: ['Poll', 'Quiz', 'Contest', 'Discussion'],
        metrics: ['engagement rate', 'time spent', 'shares', 'comments']
      },
      awareness: {
        objectives: ['Expand reach', 'Build recognition', 'Increase visibility'],
        tone: 'Broad and inclusive',
        formats: ['Branding', 'Storytelling', 'Educational'],
        metrics: ['impressions', 'reach', 'frequency', 'brand recall']
      },
      retention: {
        objectives: ['Reduce churn', 'Increase loyalty', 'Extend customer life'],
        tone: 'Personal and caring',
        formats: ['Personalized', 'Exclusive', 'VIP content'],
        metrics: ['repeat purchase', 'lifetime value', 'churn rate']
      },
      revenue: {
        objectives: ['Increase revenue', 'Upsell opportunities', 'Cross-sell'],
        tone: 'Value-focused and premium',
        formats: ['Pricing', 'Bundle', 'Premium offer'],
        metrics: ['revenue per user', 'average order value', 'repeat revenue']
      },
      growth: {
        objectives: ['Scale rapidly', 'Expand market', 'Increase adoption'],
        tone: 'Ambitious and forward-thinking',
        formats: ['Viral', 'Referral', 'Partnership'],
        metrics: ['user growth', 'market share', 'adoption rate']
      },
      efficiency: {
        objectives: ['Reduce costs', 'Optimize spend', 'Improve ROI'],
        tone: 'Smart and strategic',
        formats: ['Optimization', 'Automation', 'Efficiency tips'],
        metrics: ['CAC', 'LTV', 'conversion cost', 'ROI']
      }
    };
    
    const selected = analyticsGuidelines[analyticsGoal as keyof typeof analyticsGuidelines] || analyticsGuidelines.engagement;
    
    const platforms = {
      'instagram': {
        objectives: ['Analytics-driven content', 'Data stories', 'Performance insights'],
        tone: analyticsGoal === 'conversion' ? 'Direct and results-focused' :
              analyticsGoal === 'engagement' ? 'Interactive and community-focused' :
              analyticsGoal === 'awareness' ? 'Broad and inclusive' :
              'Insightful and educational',
        formats: ['Story', 'Carousel', 'Video', 'Infographic']
      },
      'facebook': {
        objectives: ['Community insights', 'Performance analysis', 'Trend reporting'],
        tone: analyticsGoal === 'efficiency' ? 'Strategic and analytical' :
              analyticsGoal === 'revenue' ? 'Results-focused and premium' :
              'Comprehensive and data-driven',
        formats: ['Post', 'Article', 'Video', 'Report']
      },
      'twitter': {
        objectives: ['Real-time insights', 'Quick updates', 'Data-driven opinions'],
        tone: analyticsGoal === 'growth' ? 'Ambitious and forward-thinking' :
              'Quick and informative',
        formats: ['Tweet', 'Thread', 'Poll', 'Real-time update']
      },
      'linkedin': {
        objectives: ['Professional analytics', 'Business insights', 'Corporate reporting'],
        tone: analyticsGoal === 'efficiency' || analyticsGoal === 'revenue' ? 'Professional and strategic' :
              'Authoritative and expert',
        formats: ['Article', 'Post', 'Case study', 'Dashboard']
      },
      'youtube': {
        objectives: ['Detailed analysis', 'Deep dive', 'Educational content'],
        tone: analyticsGoal === 'educational' ? 'Authoritative and clear' :
              analyticsGoal === 'awareness' ? 'Comprehensive and engaging' :
              'Informative and analytical',
        formats: ['Video', 'Vlog', 'Tutorial', 'Analysis']
      }
    };
    
    const audienceSegment = targetAudience || 
      (analyticsGoal === 'conversion' ? 'prospects and customers' :
        analyticsGoal === 'engagement' ? 'active community' :
        analyticsGoal === 'awareness' ? 'general audience' :
        analyticsGoal === 'retention' ? 'existing customers' :
        analyticsGoal === 'revenue' ? 'high-value customers' :
        analyticsGoal === 'growth' ? 'new prospects' :
        analyticsGoal === 'efficiency' ? 'cost-conscious customers' :
        'target audience');
    
    const metricsString = metrics && metrics.length > 0 ? metrics.join(', ') : 'engaged metrics';
    
    return {
      productId: productId || `product-${Date.now()}`,
      campaignObjective: analyticsGoal
        ? `${analyticsGoal} campaign focusing on ${metricsString} for ${productName || 'products'} targeting ${audienceSegment}`
        : `Analytics campaign driving ${analyticsGoal} insights for ${productName || 'products'} targeting ${audienceSegment} via ${platform}`,
      reason: `Analytics strategy opportunity detected: ${analyticsGoal} with ${metricsString} metrics for ${productName || 'Product'} targeting ${audienceSegment} via ${platform} with ${selected.tone} approach and expected ROI ${expectedROI * 100}%`,
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