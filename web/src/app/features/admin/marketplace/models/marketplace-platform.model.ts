export type PublishStatus = 'draft' | 'pending_review' | 'published' | 'unpublished' | 'suspended';

export type MarketplacePlatformType =
  | 'amazon'
  | 'flipkart'
  | 'meesho'
  | 'ajio'
  | 'myntra'
  | 'shopify'
  | 'other';

export const MARKETPLACE_PLATFORMS: MarketplacePlatformType[] = [
  'amazon', 'flipkart', 'meesho', 'ajio', 'myntra', 'shopify', 'other',
];

export const MARKETPLACE_LABELS: Record<MarketplacePlatformType, string> = {
  amazon: 'Amazon',
  flipkart: 'Flipkart',
  meesho: 'Meesho',
  ajio: 'Ajio',
  myntra: 'Myntra',
  shopify: 'Shopify',
  other: 'Other',
};

export interface MarketplacePlatform {
  id?: string;
  name: MarketplacePlatformType;
  label: string;
  enabled: boolean;
  credentials: MarketplacePlatformCredentials;
  config: MarketplacePlatformConfig;
  createdAt: Date;
  updatedAt: Date;
}

export interface MarketplacePlatformCredentials {
  apiKey: string;
  apiSecret: string;
  sellerId: string;
  automationUsername?: string;
  automationPassword?: string;
}

export interface MarketplacePlatformConfig {
  autoSync: boolean;
  syncIntervalMinutes: number;
  defaultPublishStatus: PublishStatus;
  defaultReturnPolicy: string;
  shippingConfig: {
    freeShippingAbove: number;
    shippingCharge: number;
    handlingTimeDays: number;
  };
}
