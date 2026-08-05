export type DeliverableType =
  | 'instagram-post'
  | 'instagram-reel'
  | 'story'
  | 'carousel'
  | 'pinterest'
  | 'banner'
  | 'seo'
  | 'flipkart'
  | 'email'
  | 'whatsapp';

export interface DeliverableDef {
  type: DeliverableType;
  label: string;
  icon: string;
  color: string;
  platform: string;
  description: string;
}

export interface CampaignItem {
  type: DeliverableType;
  content: string;
  words: number;
}

export interface CampaignResult {
  id: string;
  productName: string;
  tone: string;
  createdAt: string;
  items: CampaignItem[];
}

export const CAMPAIGN_TONES = ['Heritage Premium', 'Festive & Grand', 'Luxury Minimal', 'Playful & Bright', 'Casual Warm'];

export const CAMPAIGN_DELIVERABLES: DeliverableDef[] = [
  { type: 'instagram-post', label: 'Instagram Post', icon: 'bi-instagram', color: '#0f6f84', platform: 'Instagram', description: 'Feed post with hook, story and CTA.' },
  { type: 'instagram-reel', label: 'Instagram Reel', icon: 'bi-camera-reels', color: '#ec4899', platform: 'Instagram', description: 'Short-form reel script with beating.' },
  { type: 'story', label: 'Story', icon: 'bi-magic', color: '#8b5cf6', platform: 'Instagram', description: 'Punchy story with interactive prompt.' },
  { type: 'carousel', label: 'Carousel', icon: 'bi-layout-three-columns', color: '#14b8a6', platform: 'Instagram / Facebook', description: 'Swipeable slide-by-slide guide.' },
  { type: 'pinterest', label: 'Pinterest', icon: 'bi-pinterest', color: '#ef4444', platform: 'Pinterest', description: 'Pin title and save-worthy description.' },
  { type: 'banner', label: 'Website Banner', icon: 'bi-window', color: '#3b82f6', platform: 'Website', description: 'Hero banner headline and subcopy.' },
  { type: 'seo', label: 'Website SEO', icon: 'bi-search-heart', color: '#0ea5e9', platform: 'Website', description: 'Meta title, description and keywords.' },
  { type: 'flipkart', label: 'Flipkart Description', icon: 'bi-bag', color: '#c9a54c', platform: 'Flipkart', description: 'Marketplace title, bullets and details.' },
  { type: 'email', label: 'Email Campaign', icon: 'bi-envelope-paper', color: '#16a34a', platform: 'Email', description: 'Subject line, preview and body.' },
  { type: 'whatsapp', label: 'WhatsApp Promotion', icon: 'bi-whatsapp', color: '#22c55e', platform: 'WhatsApp', description: 'Short broadcast with a clear offer.' },
];

export function deliverableDef(type: DeliverableType): DeliverableDef {
  return CAMPAIGN_DELIVERABLES.find(d => d.type === type) ?? CAMPAIGN_DELIVERABLES[0];
}

export function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}