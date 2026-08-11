import { Injectable, signal } from '@angular/core';
import {
  CampaignPlan,
  CampaignPhase,
  CampaignActivity,
  CampaignKPI,
  StrategistInput,
  CAMPAIGN_DURATIONS,
  CAMPAIGN_TYPES,
  defaultStrategistInput,
} from '../models/marketing-strategist.model';

const STORAGE_KEY = 'vrindaya_marketing_strategist_plans';

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function generatePhases(input: StrategistInput): CampaignPhase[] {
  const days = CAMPAIGN_DURATIONS.find(d => d.value === input.duration)?.days || 30;
  
  const phaseTemplates: Record<typeof input.type, { name: string; description: string; startPct: number; endPct: number; activities: Omit<CampaignActivity, 'id' | 'day' | 'status'>[] }[]> = {
    launch: [
      {
        name: 'Pre-Launch Tease',
        description: 'Build anticipation with sneak peeks and behind-the-scenes content',
        startPct: 0,
        endPct: 0.3,
        activities: [
          { name: 'Teaser Reel', description: '30-sec cinematic teaser video', channel: 'Instagram', format: 'Reel', targetAudience: input.targetAudience, budget: input.budget * 0.15 },
          { name: 'Countdown Stories', description: 'Daily countdown with product hints', channel: 'Instagram', format: 'Story', targetAudience: input.targetAudience, budget: input.budget * 0.05 },
          { name: 'Influencer Seeding', description: 'Send preview products to micro-influencers', channel: 'Influencer', format: 'Reel', targetAudience: input.targetAudience, budget: input.budget * 0.2 },
          { name: 'Email Teaser', description: 'Exclusive sneak peek for subscribers', channel: 'Email', format: 'Email Newsletter', targetAudience: input.targetAudience, budget: input.budget * 0.03 },
        ],
      },
      {
        name: 'Launch Day Blitz',
        description: 'Maximum visibility across all channels on launch day',
        startPct: 0.3,
        endPct: 0.4,
        activities: [
          { name: 'Launch Reel', description: 'Hero product reveal video', channel: 'Instagram', format: 'Reel', targetAudience: input.targetAudience, budget: input.budget * 0.2 },
          { name: 'Live Launch Event', description: 'Founder/designer live showcase', channel: 'Instagram', format: 'Live', targetAudience: input.targetAudience, budget: input.budget * 0.1 },
          { name: 'WhatsApp Broadcast', description: 'Direct message with shop link', channel: 'WhatsApp', format: 'Static Post', targetAudience: input.targetAudience, budget: input.budget * 0.05 },
          { name: 'Website Banner', description: 'Homepage takeover with collection', channel: 'Website', format: 'Static Post', targetAudience: input.targetAudience, budget: input.budget * 0.05 },
        ],
      },
      {
        name: 'Post-Launch Momentum',
        description: 'Sustain interest with social proof and styling content',
        startPct: 0.4,
        endPct: 1.0,
        activities: [
          { name: 'UGC Campaign', description: 'Customer photos with branded hashtag', channel: 'Instagram', format: 'Carousel', targetAudience: input.targetAudience, budget: input.budget * 0.1 },
          { name: 'Styling Carousel', description: '3 ways to style the product', channel: 'Instagram', format: 'Carousel', targetAudience: input.targetAudience, budget: input.budget * 0.08 },
          { name: 'Founder Story', description: 'Behind the design process', channel: 'Instagram', format: 'Reel', targetAudience: input.targetAudience, budget: input.budget * 0.07 },
          { name: 'Retargeting Ads', description: 'Dynamic product ads to visitors', channel: 'Facebook', format: 'Static Post', targetAudience: input.targetAudience, budget: input.budget * 0.15 },
          { name: 'Email Follow-up', description: 'Customer reviews & social proof', channel: 'Email', format: 'Email Newsletter', targetAudience: input.targetAudience, budget: input.budget * 0.02 },
        ],
      },
    ],
    festival: [
      {
        name: 'Festival Build-up',
        description: 'Cultural storytelling and festive mood setting',
        startPct: 0,
        endPct: 0.4,
        activities: [
          { name: 'Festival Mood Reel', description: 'Cultural aesthetic video', channel: 'Instagram', format: 'Reel', targetAudience: input.targetAudience, budget: input.budget * 0.15 },
          { name: 'Tradition Carousel', description: 'Festival significance & styling', channel: 'Instagram', format: 'Carousel', targetAudience: input.targetAudience, budget: input.budget * 0.1 },
          { name: 'Influencer Festive Looks', description: 'Creator festival outfit ideas', channel: 'Influencer', format: 'Reel', targetAudience: input.targetAudience, budget: input.budget * 0.2 },
          { name: 'Email: Festive Guide', description: 'Complete festival shopping guide', channel: 'Email', format: 'Email Newsletter', targetAudience: input.targetAudience, budget: input.budget * 0.03 },
          { name: 'Pinterest Board', description: 'Curated festival inspiration', channel: 'Pinterest', format: 'Static Post', targetAudience: input.targetAudience, budget: input.budget * 0.02 },
        ],
      },
      {
        name: 'Peak Festival Push',
        description: 'High-intensity sales drive during festival week',
        startPct: 0.4,
        endPct: 0.8,
        activities: [
          { name: 'Festival Offer Reel', description: 'Limited-time offer announcement', channel: 'Instagram', format: 'Reel', targetAudience: input.targetAudience, budget: input.budget * 0.15 },
          { name: 'WhatsApp Flash Deal', description: 'Exclusive festival discount code', channel: 'WhatsApp', format: 'Static Post', targetAudience: input.targetAudience, budget: input.budget * 0.05 },
          { name: 'Story Countdown', description: 'Daily festival deal reveals', channel: 'Instagram', format: 'Story', targetAudience: input.targetAudience, budget: input.budget * 0.08 },
          { name: 'YouTube Shorts Haul', description: 'Festival shopping haul video', channel: 'YouTube Shorts', format: 'Short Video', targetAudience: input.targetAudience, budget: input.budget * 0.1 },
          { name: 'Retargeting: Cart Abandon', description: 'Festival urgency messaging', channel: 'Facebook', format: 'Static Post', targetAudience: input.targetAudience, budget: input.budget * 0.12 },
        ],
      },
      {
        name: 'Post-Festival Nurture',
        description: 'Extend festival spirit with gratitude and loyalty',
        startPct: 0.8,
        endPct: 1.0,
        activities: [
          { name: 'Thank You Post', description: 'Festival gratitude & highlights', channel: 'Instagram', format: 'Carousel', targetAudience: input.targetAudience, budget: input.budget * 0.05 },
          { name: 'Loyalty Email', description: 'Early access to next collection', channel: 'Email', format: 'Email Newsletter', targetAudience: input.targetAudience, budget: input.budget * 0.02 },
          { name: 'UGC Festival Rewind', description: 'Customer festival moments', channel: 'Instagram', format: 'Reel', targetAudience: input.targetAudience, budget: input.budget * 0.08 },
        ],
      },
    ],
    'flash-sale': [
      {
        name: 'Pre-Sale Hype',
        description: 'Build urgency and collect intent signals',
        startPct: 0,
        endPct: 0.5,
        activities: [
          { name: 'Save the Date Reel', description: 'Flash sale announcement', channel: 'Instagram', format: 'Reel', targetAudience: input.targetAudience, budget: input.budget * 0.2 },
          { name: 'Story Teasers', description: 'Product glimpses with blur', channel: 'Instagram', format: 'Story', targetAudience: input.targetAudience, budget: input.budget * 0.05 },
          { name: 'WhatsApp Opt-in', description: 'Early access sign-up', channel: 'WhatsApp', format: 'Static Post', targetAudience: input.targetAudience, budget: input.budget * 0.05 },
          { name: 'Email Countdown', description: 'Daily reminders with timer', channel: 'Email', format: 'Email Newsletter', targetAudience: input.targetAudience, budget: input.budget * 0.03 },
        ],
      },
      {
        name: 'Sale Execution',
        description: 'Live sale management with real-time updates',
        startPct: 0.5,
        endPct: 0.9,
        activities: [
          { name: 'Sale Live Reel', description: 'Real-time sale kickoff', channel: 'Instagram', format: 'Live', targetAudience: input.targetAudience, budget: input.budget * 0.15 },
          { name: 'Hourly Story Updates', description: 'Stock alerts & bestsellers', channel: 'Instagram', format: 'Story', targetAudience: input.targetAudience, budget: input.budget * 0.1 },
          { name: 'WhatsApp Flash Alerts', description: 'Price drop notifications', channel: 'WhatsApp', format: 'Static Post', targetAudience: input.targetAudience, budget: input.budget * 0.08 },
          { name: 'Retargeting Blitz', description: 'High-frequency sale ads', channel: 'Facebook', format: 'Static Post', targetAudience: input.targetAudience, budget: input.budget * 0.25 },
        ],
      },
      {
        name: 'Post-Sale Close',
        description: 'Convert stragglers and capture feedback',
        startPct: 0.9,
        endPct: 1.0,
        activities: [
          { name: 'Last Chance Story', description: 'Final hours urgency', channel: 'Instagram', format: 'Story', targetAudience: input.targetAudience, budget: input.budget * 0.05 },
          { name: 'Sale Recap Post', description: 'Bestsellers & thank you', channel: 'Instagram', format: 'Carousel', targetAudience: input.targetAudience, budget: input.budget * 0.03 },
          { name: 'Feedback Email', description: 'Quick survey for buyers', channel: 'Email', format: 'Email Newsletter', targetAudience: input.targetAudience, budget: input.budget * 0.01 },
        ],
      },
    ],
    'collection-launch': [
      {
        name: 'Collection Preview',
        description: 'Tease the theme and hero pieces',
        startPct: 0,
        endPct: 0.25,
        activities: [
          { name: 'Theme Reveal Reel', description: 'Collection inspiration story', channel: 'Instagram', format: 'Reel', targetAudience: input.targetAudience, budget: input.budget * 0.15 },
          { name: 'Mood Board Carousel', description: 'Colors, fabrics, silhouettes', channel: 'Instagram', format: 'Carousel', targetAudience: input.targetAudience, budget: input.budget * 0.1 },
          { name: 'Designer Interview', description: 'Creative director insights', channel: 'Instagram', format: 'Reel', targetAudience: input.targetAudience, budget: input.budget * 0.1 },
          { name: 'Press & Influencer Kit', description: 'Lookbook & samples to media', channel: 'Influencer', format: 'Static Post', targetAudience: input.targetAudience, budget: input.budget * 0.15 },
          { name: 'Email: Coming Soon', description: 'VIP early access invite', channel: 'Email', format: 'Email Newsletter', targetAudience: input.targetAudience, budget: input.budget * 0.03 },
        ],
      },
      {
        name: 'Collection Launch Week',
        description: 'Full reveal with shoppable content',
        startPct: 0.25,
        endPct: 0.6,
        activities: [
          { name: 'Lookbook Video', description: 'Full collection runway-style', channel: 'Instagram', format: 'Reel', targetAudience: input.targetAudience, budget: input.budget * 0.2 },
          { name: 'Hero Piece Spotlights', description: 'Daily hero product features', channel: 'Instagram', format: 'Carousel', targetAudience: input.targetAudience, budget: input.budget * 0.15 },
          { name: 'Styling Live Session', description: 'How to wear the collection', channel: 'Instagram', format: 'Live', targetAudience: input.targetAudience, budget: input.budget * 0.1 },
          { name: 'WhatsApp Catalog', description: 'Shoppable collection link', channel: 'WhatsApp', format: 'Static Post', targetAudience: input.targetAudience, budget: input.budget * 0.05 },
          { name: 'Website Collection Page', description: 'Dedicated landing experience', channel: 'Website', format: 'Blog Post', targetAudience: input.targetAudience, budget: input.budget * 0.05 },
        ],
      },
      {
        name: 'Collection Sustain',
        description: 'Style guides, UGC, and evergreen content',
        startPct: 0.6,
        endPct: 1.0,
        activities: [
          { name: 'Occasion Styling', description: 'Wedding, office, festive looks', channel: 'Instagram', format: 'Carousel', targetAudience: input.targetAudience, budget: input.budget * 0.1 },
          { name: 'Fabric Deep Dive', description: 'Craftsmanship & material story', channel: 'Instagram', format: 'Reel', targetAudience: input.targetAudience, budget: input.budget * 0.08 },
          { name: 'Customer Lookbook', description: 'Real women in collection', channel: 'Instagram', format: 'Reel', targetAudience: input.targetAudience, budget: input.budget * 0.08 },
          { name: 'Retargeting: Browse Abandon', description: 'Dynamic collection ads', channel: 'Facebook', format: 'Static Post', targetAudience: input.targetAudience, budget: input.budget * 0.12 },
          { name: 'Email: Style Guide', description: 'Downloadable PDF guide', channel: 'Email', format: 'Email Newsletter', targetAudience: input.targetAudience, budget: input.budget * 0.02 },
        ],
      },
    ],
  };

  const templates = phaseTemplates[input.type];
  const phases: CampaignPhase[] = [];

  templates.forEach((template, phaseIndex) => {
    const startDay = Math.ceil(template.startPct * days);
    const endDay = Math.floor(template.endPct * days);
    
    const activities: CampaignActivity[] = template.activities.map((act, actIndex) => ({
      ...act,
      id: uid(),
      day: startDay + Math.floor((actIndex / template.activities.length) * (endDay - startDay + 1)),
      status: 'planned' as const,
    }));

    phases.push({
      id: uid(),
      name: template.name,
      description: template.description,
      startDay,
      endDay,
      activities,
      deliverables: [
        `${activities.length} content pieces`,
        `${new Set(activities.map(a => a.channel)).size} channels activated`,
        'Performance report',
      ],
      owner: phaseIndex === 0 ? 'Content Team' : phaseIndex === 1 ? 'Growth Team' : 'Community Team',
      status: 'planned',
    });
  });

  return phases;
}

function generateKPIs(input: StrategistInput): CampaignKPI[] {
  const baseKPIs: CampaignKPI[] = [
    { metric: 'Reach', target: '500K', current: '0', unit: 'impressions' },
    { metric: 'Engagement Rate', target: '4.5%', current: '0%', unit: '%' },
    { metric: 'Website Traffic', target: '25K', current: '0', unit: 'sessions' },
    { metric: 'Conversions', target: '500', current: '0', unit: 'orders' },
    { metric: 'Revenue', target: '₹25L', current: '₹0', unit: 'INR' },
    { metric: 'ROAS', target: '4.5x', current: '0x', unit: 'ratio' },
    { metric: 'Email Open Rate', target: '28%', current: '0%', unit: '%' },
    { metric: 'UGC Submissions', target: '200', current: '0', unit: 'posts' },
  ];

  if (input.type === 'flash-sale') {
    baseKPIs.find(k => k.metric === 'Conversions')!.target = '1,000';
    baseKPIs.find(k => k.metric === 'Revenue')!.target = '₹50L';
  }
  if (input.type === 'collection-launch') {
    baseKPIs.find(k => k.metric === 'UGC Submissions')!.target = '500';
  }
  if (input.duration === '90day') {
    baseKPIs.find(k => k.metric === 'Reach')!.target = '2M';
    baseKPIs.find(k => k.metric === 'Website Traffic')!.target = '100K';
  }

  return baseKPIs;
}

@Injectable({ providedIn: 'root' })
export class MarketingStrategistService {
  readonly plans = signal<CampaignPlan[]>([]);

  private load(): CampaignPlan[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as CampaignPlan[];
        if (Array.isArray(parsed)) return parsed.slice(0, 20);
      }
    } catch { /* ignore */ }
    return [];
  }

  constructor() {
    this.plans.set(this.load());
  }

  private persist(): void {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.plans())); } catch { /* ignore */ }
  }

  generatePlan(input: StrategistInput): CampaignPlan {
    const startDate = new Date(input.startDate);
    const days = CAMPAIGN_DURATIONS.find(d => d.value === input.duration)?.days || 30;
    const endDate = addDays(startDate, days);
    const typeConfig = CAMPAIGN_TYPES.find(t => t.value === input.type)!;

    const plan: CampaignPlan = {
      id: uid(),
      name: input.campaignName || `${typeConfig.label} - ${formatDate(startDate)}`,
      type: input.type,
      duration: input.duration,
      startDate: formatDate(startDate),
      endDate: formatDate(endDate),
      objective: input.objective,
      budget: input.budget,
      phases: generatePhases(input),
      kpis: generateKPIs(input),
      createdAt: new Date().toISOString(),
    };

    this.plans.update(list => [plan, ...list].slice(0, 20));
    this.persist();

    return plan;
  }

  getPlan(id: string): CampaignPlan | undefined {
    return this.plans().find(p => p.id === id);
  }

  deletePlan(id: string): void {
    this.plans.update(list => list.filter(p => p.id !== id));
    this.persist();
  }

  clearHistory(): void {
    this.plans.set([]);
    this.persist();
  }

  getDefaultInput(): StrategistInput {
    return defaultStrategistInput();
  }
}