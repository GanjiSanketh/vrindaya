import { NamedValue } from './inventory.model';

export const LISTING_STATUSES = ['Draft', 'Ready', 'Published', 'Rejected', 'Inactive', 'Archived'] as const;
export type ListingStatus = typeof LISTING_STATUSES[number];

export const LISTING_QUALITIES = ['High', 'Medium', 'Low'] as const;
export type ListingQuality = typeof LISTING_QUALITIES[number];

export const SYNC_STATUSES = ['Not Synced', 'Pending', 'In Sync', 'Sync Failed'] as const;
export type SyncStatus = typeof SYNC_STATUSES[number];

export const MARKETPLACE_OPTIONS = ['Website', 'Flipkart', 'Amazon'] as const;
export type MarketplaceOption = typeof MARKETPLACE_OPTIONS[number];

export interface ProductListing {
  id: string;
  productId: string;
  productName: string | null;
  marketplace: string;
  listingStatus: string;
  listingQuality: string;
  flipkartListingId: string | null;
  marketplacePrice: number;
  inventory: number;
  syncStatus: string;
  lastSyncedAt: string | null;
  updatedAt: string;
}

export interface ProductListingQuery {
  search?: string;
  marketplace?: string;
  listingStatus?: string;
  listingQuality?: string;
  syncStatus?: string;
  cursor?: string;
  pageSize?: number;
}

export interface UpdateProductListingRequest {
  listingStatus: string;
  listingQuality?: string;
  flipkartListingId?: string;
  marketplacePrice: number;
  inventory: number;
  syncStatus?: string;
}

export interface BulkUpdateListingStatusRequest {
  listingIds: string[];
  listingStatus: string;
}

export interface ProductProfitabilityRow {
  productId: string;
  productName: string;
  category: string;
  marketplace: string;

  purchaseCost: number;
  packagingCost: number;
  advertisementCost: number;
  marketplaceCommission: number;
  shippingCost: number;
  miscellaneousCost: number;
  totalCost: number;

  sellingPrice: number;
  expectedSettlement: number;
  netProfit: number;
  profitPercentage: number;
  roiPercentage: number;

  currentStock: number;
  soldStock: number;
  investment: number;
  inventoryValue: number;
  expectedRevenue: number;
  expectedProfit: number;
}

export interface ProfitabilityFilters {
  filter?: string;
  marketplace?: string;
  category?: string;
  search?: string;
  cursor?: string;
  pageSize?: number;
}

export interface MarketplaceDashboard {
  totalListings: number;
  publishedCount: number;
  rejectedCount: number;
  draftCount: number;
  inventoryValue: number;
  potentialRevenue: number;
  expectedProfit: number;
  averageMargin: number;
  lowStockCount: number;
  outOfStockCount: number;

  inventoryByCategory: NamedValue[];
  profitByCategory: NamedValue[];
  investmentBySupplier: NamedValue[];
  marketplaceMargin: NamedValue[];
}
