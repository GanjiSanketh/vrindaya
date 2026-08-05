export type CampaignDuration = '7day' | '15day' | '30day' | '90day';
export type CampaignType = 'launch' | 'festival' | 'flash-sale' | 'collection-launch';

export interface CampaignPlan {
  id: string;
  name: string;
  type: CampaignType;
  duration: CampaignDuration;
  startDate: string;
  endDate: string;
  objective: string;
  budget: number;
  phases: CampaignPhase[];
  kpis: CampaignKPI[];
  createdAt: string;
}

export interface CampaignPhase {
  id: string;
  name: string;
  description: string;
  startDay: number;
  endDay: number;
  activities: CampaignActivity[];
  deliverables: string[];
  owner: string;
  status: 'planned' | 'in-progress' | 'completed' | 'delayed';
}

export interface CampaignActivity {
  id: string;
  name: string;
  description: string;
  day: number;
  channel: string;
  format: string;
  targetAudience: string;
  budget: number;
  status: 'planned' | 'in-progress' | 'completed' | 'delayed';
}

export interface CampaignKPI {
  metric: string;
  target: string;
  current: string;
  unit: string;
}

export interface StrategistInput {
  campaignName: string;
  type: CampaignType;
  duration: CampaignDuration;
  startDate: string;
  budget: number;
  objective: string;
  productCategory: string;
  targetAudience: string;
  keyMessage: string;
}

export const CAMPAIGN_DURATIONS: { value: CampaignDuration; label: string; days: number }[] = [
  { value: '7day', label: '7 Day Sprint', days: 7 },
  { value: '15day', label: '15 Day Campaign', days: 15 },
  { value: '30day', label: '30 Day Campaign', days: 30 },
  { value: '90day', label: '90 Day Quarter', days: 90 },
];

export const CAMPAIGN_TYPES: { value: CampaignType; label: string; icon: string; description: string }[] = [
  { value: 'launch', label: 'Product Launch', icon: 'bi-rocket-takeoff', description: 'New product introduction with buzz building' },
  { value: 'festival', label: 'Festival Campaign', icon: 'bi-stars', description: 'Seasonal festival marketing with cultural relevance' },
  { value: 'flash-sale', label: 'Flash Sale', icon: 'bi-lightning-charge', description: 'Short high-intensity promotional burst' },
  { value: 'collection-launch', label: 'Collection Launch', icon: 'bi-collection', description: 'Multi-product seasonal collection reveal' },
];

export const CHANNELS = ['Instagram', 'Facebook', 'WhatsApp', 'Email', 'Website', 'Influencer', 'Pinterest', 'YouTube Shorts'];
export const FORMATS = ['Reel', 'Carousel', 'Story', 'Static Post', 'Live', 'Email Newsletter', 'Blog Post', 'Short Video'];
export const PRODUCT_CATEGORIES = ['Sarees', 'Lehengas', 'Kurtas', 'Suits', 'Dupattas', 'Blouses', 'Accessories', 'Ethnic Wear'];
export const TARGET_AUDIENCES = ['Brides-to-be', 'Working Women', 'Festival Shoppers', 'College Students', 'Luxury Buyers', 'Mature Women'];

export function defaultStrategistInput(): StrategistInput {
  return {
    campaignName: '',
    type: 'launch',
    duration: '30day',
    startDate: new Date().toISOString().split('T')[0],
    budget: 100000,
    objective: 'Drive awareness and conversions for new collection',
    productCategory: 'Sarees',
    targetAudience: 'Working Women',
    keyMessage: 'Timeless elegance for the modern woman',
  };
}