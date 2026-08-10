import { ICampaignStrategy } from './campaign-strategy.interface';
import { CampaignDecision } from '../models/campaign-decision.model';
import { CampaignPlatform } from '../models/campaign-model';
import { CampaignPriority } from '../models/campaign-decision.model';

export class CollaborationCampaignStrategy implements ICampaignStrategy {
  canHandle(data: any): boolean {
    if (!data) return false;
    
    const {
      collaborationType,
      partnerBrand,
      targetAudience,
      platform,
      productId,
      productName,
      season,
    } = data;
    
    const hasCollaborationType = !!collaborationType;
    const hasPartnerBrand = !!partnerBrand;
    const hasTarget = !!targetAudience;
    const hasPlatform = !!platform;
    const hasSeason = !!season;
    const hasProduct = !!productId || !!productName;
    
    const validPlatforms: CampaignPlatform[] = [
      'instagram', 'facebook', 'twitter', 'linkedin', 
      'pinterest', 'tiktok', 'youtube', 'whatsApp', 'sms', 'email'
    ];
    
    const validCollaborationTypes = [
      'influencer', 'partnership', 'coup', 'giveaway', 
      'joint venture', 'sponsored', 'referral'
    ];
    
    return (hasCollaborationType && validCollaborationTypes.includes(collaborationType)) || 
           hasPartnerBrand || 
           validPlatforms.includes(platform as CampaignPlatform) || 
           hasTarget || 
           hasProduct;
  }

  generate(data: any): CampaignDecision {
    const {
      collaborationType = 'influencer',
      partnerBrand,
      targetAudience,
      platform = 'instagram',
      productId,
      productName,
      season = 'Festive',
      score = 80,
      confidence = 0.85,
      expectedROI = 0.18,
      estimatedRevenue = 50000,
    } = data;
    
    const collaborationGuidelines = {
      influencer: {
        objectives: ['Reach new audience', 'Build credibility', 'Drive sales'],
        tone: 'Authentic and relatable',
        formats: ['Story takeover', 'Unboxing', 'Tutorial', 'Review'],
        influencers: ['mega', 'macro', 'micro', 'nano']
      },
      partnership: {
        objectives: ['Co-create content', 'Joint promotion', 'Shared audience'],
        tone: 'Professional and collaborative',
        formats: ['Joint campaign', 'Co-branded content', 'Partnership announcement'],
        partners: ['brand', 'non-profit', 'startup', 'media']
      },
      coup: {
        objectives: ['Create urgency', 'Drive immediate action', 'Cross-promotion'],
        tone: 'Exciting and time-sensitive',
        formats: ['Limited offer', 'Countdown', 'Flash collaboration'],
        urgency: ['24 hours', '48 hours', 'limited stock']
      },
      giveaway: {
        objectives: ['Generate leads', 'Build community', 'Create buzz'],
        tone: 'Generous and engaging',
        formats: ['Contest', 'Sweepstakes', 'Random draw'],
        requirements: ['follow', 'share', 'comment', 'tag']
      },
      'joint venture': {
        objectives: ['Long-term partnership', 'Shared growth', 'Expanded reach'],
        tone: 'Strategic and forward-thinking',
        formats: ['Launch announcement', 'Progress update', 'Success story'],
        types: ['product', 'service', 'experience', 'service package']
      },
      sponsored: {
        objectives: ['Sponsored content', 'Brand alignment', 'Monetized partnership'],
        tone: 'Clear and transparent',
        formats: ['Sponsored post', 'Sponsored video', 'Affiliate content'],
        compensation: ['fixed', 'performance-based', 'revenue-sharing']
      },
      referral: {
        objectives: ['Customer acquisition', 'Reward loyalty', 'Viral growth'],
        tone: 'Rewarding and motivating',
        formats: ['Referral program', 'Referral link', 'Referral campaign'],
        incentives: ['discount', 'free', 'points', 'cashback']
      }
    };
    
    const selected = collaborationGuidelines[collaborationType as keyof typeof collaborationGuidelines] || collaborationGuidelines.influencer;
    
    const platforms = {
      'instagram': {
        objectives: ['Influencer story takeover', 'Joint reels', 'Collaborative carousel'],
        tone: collaborationType === 'influencer' ? 'Personal and authentic' :
              collaborationType === 'partnership' ? 'Professional and polished' :
              collaborationType === 'coup' ? 'Exciting and urgent' :
              'Engaging and interactive',
        formats: ['Story', 'Reel', 'Carousel', 'Video']
      },
      'facebook': {
        objectives: ['Event creation', 'Group discussion', 'Community building'],
        tone: collaborationType === 'partnership' ? 'Professional and informative' :
              collaborationType === 'joint venture' ? 'Strategic and forward-thinking' :
              'Engaging and collaborative',
        formats: ['Event', 'Post', 'Group', 'Video']
      },
      'twitter': {
        objectives: ['Real-time updates', 'Thread discussions', 'Hashtag trends'],
        tone: collaborationType === 'coup' ? 'Quick and exciting' :
              collaborationType === 'giveaway' ? 'Generous and engaging' :
              'Engaging and conversational',
        formats: ['Tweet', 'Thread', 'Poll', 'Hashtag campaign']
      },
      'linkedin': {
        objectives: ['B2B partnerships', 'Thought leadership', 'Professional networking'],
        tone: collaborationType === 'partnership' || collaborationType === 'joint venture' ? 'Professional and strategic' :
              'Authoritative and business-focused',
        formats: ['Article', 'Post', 'Case study', 'White paper']
      },
      'youtube': {
        objectives: ['Long-form collaboration', 'Deep dive', 'Educational content'],
        tone: collaborationType === 'influencer' ? 'Personal and authentic' :
              collaborationType === 'tutorial' ? 'Educational and expert' :
              'Engaging and professional',
        formats: ['Video', 'Vlog', 'Tutorial', 'Documentary']
      }
    };
    
    const selectedCampaigns = platforms[platform as keyof typeof platforms] || platforms.instagram;
    
    const audienceSegment = targetAudience || 
      (season.toLowerCase().includes('diwali') ? 'festive shoppers' :
        season.toLowerCase().includes('eid') ? 'celebration seekers' :
        season.toLowerCase().includes('summer') ? 'summer enthusiasts' :
        'general audience');
    
    const partnerInfo = partnerBrand || 
      (collaborationType === 'influencer' ? 'Popular lifestyle influencer' :
        collaborationType === 'partnership' ? 'Complementary brand partner' :
        collaborationType === 'joint venture' ? 'Strategic growth partner' :
        'Exciting partner');
    
    return {
      productId: productId || `product-${Date.now()}`,
      campaignObjective: partnerBrand
        ? `Collaboration with ${partnerBrand} for ${productName || 'products'} targeting ${audienceSegment}`
        : `Collaboration campaign using ${collaborationType} strategy for ${productName || 'products'} during ${season} season targeting ${audienceSegment} via ${platform}`,
      reason: `Collaboration opportunity detected: ${collaborationType} with ${partnerInfo} for ${productName || 'Product'} targeting ${audienceSegment} via ${platform} with ${selected.tone} approach and expected ROI ${expectedROI * 100}%`,
      priority: score >= 85 
        ? 'critical' 
        : score >= 80 
        ? 'high' 
        : score >= 70 
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