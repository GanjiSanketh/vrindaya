export type MarketingTool =
  | 'instagram-post' | 'instagram-reel' | 'facebook-post'
  | 'pinterest' | 'whatsapp-catalog' | 'caption' | 'hashtag' | 'seo';

export interface MarketingCampaign {
  id: string;
  tool: MarketingTool;
  label: string;
  productName: string;
  productId?: string;
  prompt: string;
  result: string;
  tone?: string;
  platform?: string;
  createdAt: string;
}

export const MARKETING_TOOL_LABELS: Record<MarketingTool, string> = {
  'instagram-post': 'Instagram Post',
  'instagram-reel': 'Instagram Reel',
  'facebook-post': 'Facebook Post',
  'pinterest': 'Pinterest Pin',
  'whatsapp-catalog': 'WhatsApp Catalog',
  'caption': 'Caption',
  'hashtag': 'Hashtags',
  'seo': 'SEO Meta',
};

export const MARKETING_TOOL_ICONS: Record<MarketingTool, string> = {
  'instagram-post': 'bi-instagram',
  'instagram-reel': 'bi-camera-reels',
  'facebook-post': 'bi-facebook',
  'pinterest': 'bi-pinterest',
  'whatsapp-catalog': 'bi-whatsapp',
  'caption': 'bi-chat-quote',
  'hashtag': 'bi-hash',
  'seo': 'bi-search-heart',
};
