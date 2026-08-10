import { ICampaignStrategy } from './campaign-strategy.interface';
import { CampaignDecision } from '../models/campaign-decision.model';
import { CampaignPlatform } from '../models/campaign-model';
import { CampaignPriority } from '../models/campaign-decision.model';

export class ContentCampaignStrategy implements ICampaignStrategy {
  canHandle(data: any): boolean {
    if (!data) return false;
    
    const {
      contentType,
      contentFocus,
      targetAudience,
      platform,
      productId,
      productName,
      season,
    } = data;
    
    const hasContentType = !!contentType;
    const hasContentFocus = !!contentFocus;
    const hasTarget = !!targetAudience;
    const hasPlatform = !!platform;
    const hasSeason = !!season;
    const hasProduct = !!productId || !!productName;
    
    const validPlatforms: CampaignPlatform[] = [
      'instagram', 'facebook', 'twitter', 'linkedin', 
      'pinterest', 'tiktok', 'youtube', 'whatsApp', 'sms', 'email'
    ];
    
    const validContentTypes = [
      'educational', 'entertaining', 'inspiring', 'promotional', 
      'storytelling', 'tutorial', 'review', 'comparison'
    ];
    
    return (hasContentType && validContentTypes.includes(contentType)) || 
           hasContentFocus || 
           validPlatforms.includes(platform as CampaignPlatform) || 
           hasTarget || 
           hasProduct;
  }

  generate(data: any): CampaignDecision {
    const {
      contentType = 'educational',
      contentFocus,
      targetAudience,
      platform = 'instagram',
      productId,
      productName,
      season = 'Festive',
      score = 75,
      confidence = 0.80,
      expectedROI = 0.15,
      estimatedRevenue = 40000,
    } = data;
    
    const contentGuidelines = {
      educational: {
        objectives: ['Teach product benefits', 'Show usage tips', 'Demonstrate value'],
        tone: 'Informative and helpful',
        formats: ['Tutorial', 'Story', 'How-to guide', 'Tips']
      },
      entertaining: {
        objectives: ['Entertain while informing', 'Create shareable moments', 'Engage emotionally'],
        tone: 'Fun and engaging',
        formats: ['Story', 'Reel', 'Comedy sketch', 'Challenge']
      },
      inspiring: {
        objectives: ['Motivate users', 'Create aspiration', 'Build community'],
        tone: 'Inspirational and motivational',
        formats: ['Testimonial', 'Journey', 'Behind-the-scenes', 'Celebration']
      },
      promotional: {
        objectives: ['Drive conversions', 'Create urgency', 'Highlight offers'],
        tone: 'Direct and persuasive',
        formats: ['Offer', 'Limited-time', 'Flash sale', 'Deal']
      },
      storytelling: {
        objectives: ['Share journey', 'Create connection', 'Build narrative'],
        tone: 'Authentic and personal',
        formats: ['Origin story', 'Customer journey', 'Behind-the-scenes']
      },
      tutorial: {
        objectives: ['Teach skills', 'Show mastery', 'Create dependency'],
        tone: 'Authoritative and clear',
        formats: ['Step-by-step', 'Expert tips', 'Best practices']
      },
      review: {
        objectives: ['Build trust', 'Provide honesty', 'Help decision-making'],
        tone: 'Balanced and honest',
        formats: ['Pros/cons', 'Rating', 'Comparison', 'Analysis']
      },
      comparison: {
        objectives: ['Show value', 'Highlight differentiators', 'Guide choice'],
        tone: 'Analytical and informative',
        formats: ['Side-by-side', 'Benefits', 'Features']
      }
    };
    
    const selected = contentGuidelines[contentType as keyof typeof contentGuidelines] || contentGuidelines.educational;
    
    const platforms = {
      'instagram': {
        objectives: ['Stories teaching tips', 'Reels demonstrating value', 'Carousel showing benefits'],
        tone: contentType === 'educational' ? 'Helpful and clear' : 
              contentType === 'entertaining' ? 'Fun and engaging' :
              contentType === 'inspiring' ? 'Motivational and uplifting' :
              'Engaging and persuasive',
        formats: ['Story', 'Reel', 'Carousel', 'Video']
      },
      'facebook': {
        objectives: ['Long-form content', 'Community sharing', 'Discussion generation'],
        tone: contentType === 'educational' ? 'Authoritative and clear' :
              contentType === 'review' ? 'Balanced and honest' :
              'Engaging and informative',
        formats: ['Post', 'Article', 'Video', 'Event']
      },
      'youtube': {
        objectives: ['Demonstrations', 'Tutorials', 'Deep dives'],
        tone: contentType === 'tutorial' ? 'Authoritative and clear' :
              contentType === 'educational' ? 'Informative and helpful' :
              'Engaging and professional',
        formats: ['Video', 'Vlog', 'Demonstration', 'Tutorial']
      },
      'linkedin': {
        objectives: ['Thought leadership', 'Professional insights', 'Industry knowledge'],
        tone: contentType === 'educational' ? 'Professional and expert' :
              contentType === 'comparison' ? 'Analytical and data-driven' :
              'Authoritative and credible',
        formats: ['Article', 'Post', 'Case study', 'Infographic']
      },
      'twitter': {
        objectives: ['Quick tips', 'Fact sharing', 'Opinion pieces'],
        tone: contentType === 'educational' ? 'Concise and clear' :
              contentType === 'review' ? 'Direct and honest' :
              'Engaging and thought-provoking',
        formats: ['Tweet', 'Thread', 'Poll', 'Quote']
      }
    };
    
    const selectedCampaigns = platforms[platform as keyof typeof platforms] || platforms.instagram;
    
    const audienceSegment = contentFocus || 
      (targetAudience ? targetAudience.toLowerCase() : 
        season.toLowerCase().includes('diwali') ? 'festive shoppers' :
        season.toLowerCase().includes('eid') ? 'celebration seekers' :
        season.toLowerCase().includes('summer') ? 'summer enthusiasts' :
        season.toLowerCase().includes('winter') ? 'winter lovers' :
        'general audience');
    
    return {
      productId: productId || `product-${Date.now()}`,
      campaignObjective: contentFocus
        ? `${contentType} campaign focusing on ${contentFocus} for ${productName || 'products'} targeting ${audienceSegment}`
        : `Content campaign creating ${contentType}-focused content for ${productName || 'products'} during ${season} season targeting ${audienceSegment} via ${platform}`,
      reason: `Content strategy opportunity detected: ${contentType} content focus for ${productName || 'Product'} targeting ${audienceSegment} via ${platform} with ${selected.tone} approach and expected ROI ${expectedROI * 100}%`,
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