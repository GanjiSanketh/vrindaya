import type { MarketplacePlatformType, PublishStatus } from './marketplace-platform.model';
import type { MarketplacePricing } from './marketplace-pricing.model';
import type { MarketplaceInventory } from './marketplace-inventory.model';

export type ListingStatus = 'active' | 'inactive' | 'draft' | 'pending' | 'rejected' | 'blocked';

export type AiStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'not_applicable';

export type FulfillmentType = 'self' | 'marketplace_fba' | 'dropship';

export interface MarketplaceListing {
  id?: string;
  marketplaceProductId: string;
  websiteProductId: string;
  platform: MarketplacePlatformType;
  marketplaceTitle: string;
  marketplaceDescription: string;
  listingStatus: ListingStatus;
  marketplaceSku: string;
  sellerSku: string;
  listingUrl: string;
  fsn: string;
  marketplaceListingId: string;
  pricing: MarketplacePricing;
  inventory: MarketplaceInventory;
  aiStatus: AiStatus;
  publishStatus: PublishStatus;
  fulfillmentType: FulfillmentType;
  handlingTimeDays: number;
  returnPolicy: string;
  shippingWeight: number;
  shippingWeightUnit: 'g' | 'kg' | 'lb';
  version: number;
  createdBy?: string;
  updatedBy?: string;
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
