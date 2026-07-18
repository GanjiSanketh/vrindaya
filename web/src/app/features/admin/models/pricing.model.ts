export interface PricingRow {
  id: string;
  inventoryVariantId: string;
  marketplace: string;

  costPrice: number;
  packingCharge: number;
  shippingCharge: number;
  advertisingCharge: number;
  marketplaceCommission: number;
  fixedMarketplaceFee: number;
  paymentGatewayCharge: number;
  otherCharges: number;
  gstPercentage: number;

  desiredProfit: number;

  mrp: number;
  listingPrice: number;
  offerPrice: number | null;
  suggestedSellingPrice: number;

  actualProfit: number;
  marginPercentage: number;

  currency: string;
  isActive: boolean;

  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePricingRequest {
  inventoryVariantId: string;
  marketplace: string;
  costPrice: number;
  packingCharge: number;
  shippingCharge: number;
  advertisingCharge: number;
  marketplaceCommission: number;
  fixedMarketplaceFee: number;
  paymentGatewayCharge: number;
  otherCharges: number;
  gstPercentage: number;
  desiredProfit: number;
  mrp: number;
  listingPrice: number;
  offerPrice: number | null;
  currency?: string;
  isActive?: boolean;
}

export interface UpdatePricingRequest {
  costPrice?: number;
  packingCharge?: number;
  shippingCharge?: number;
  advertisingCharge?: number;
  marketplaceCommission?: number;
  fixedMarketplaceFee?: number;
  paymentGatewayCharge?: number;
  otherCharges?: number;
  gstPercentage?: number;
  desiredProfit?: number;
  mrp?: number;
  listingPrice?: number;
  offerPrice?: number | null;
  currency?: string;
  isActive?: boolean;
  reason?: string;
}

export interface PricingQuery {
  search?: string;
  marketplace?: string;
  isActive?: boolean;
  inventoryVariantId?: string;
  sortBy?: string;
  sortDescending?: boolean;
  cursor?: string;
  pageSize?: number;
}

export type BulkOperation = 'IncreasePercent' | 'DecreasePercent' | 'FixedAmount';

export interface BulkFieldUpdate {
  operation: BulkOperation;
  value: number;
}

export interface BulkPricingUpdateRequest {
  pricingIds: string[];
  packingCharge?: BulkFieldUpdate;
  advertisingCharge?: BulkFieldUpdate;
  desiredProfit?: BulkFieldUpdate;
  marketplaceCommission?: BulkFieldUpdate;
}

export interface PricingPreviewItem {
  pricingId: string;
  marketplace: string;
  currentPackingCharge: number;
  newPackingCharge: number | null;
  currentAdvertisingCharge: number;
  newAdvertisingCharge: number | null;
  currentDesiredProfit: number;
  newDesiredProfit: number | null;
  currentMarketplaceCommission: number;
  newMarketplaceCommission: number | null;
  currentTotalCost: number;
  newTotalCost: number;
  currentListingPrice: number;
  newListingPrice: number;
  currentProfit: number;
  newProfit: number;
  profitDifference: number;
}

export interface BulkPricingPreviewResponse {
  items: PricingPreviewItem[];
  affectedCount: number;
}

// ── Dashboard ──────────────────────────────────────────────────────────────

export interface PricingDashboardResponse {
  averageProfit: number;
  averageMargin: number;
  highestProfitProduct: PricingDashboardTopProduct | null;
  lowestProfitProduct: PricingDashboardTopProduct | null;
  productsBelowTargetProfit: number;
  productsWithNegativeProfit: number;
  productsWithoutPricing: number;
  productsWithOutdatedPricing: number;
  profitDistribution: DistributionBucket[];
  marginDistribution: DistributionBucket[];
  marketplaceComparison: MarketplaceBreakdown[];
  top20ProfitableProducts: PricingDashboardTopProduct[];
}

export interface PricingDashboardTopProduct {
  pricingId: string;
  inventoryVariantId: string;
  marketplace: string;
  color: string;
  size: string;
  sku: string;
  listingPrice: number;
  actualProfit: number;
  marginPercentage: number;
}

export interface DistributionBucket {
  label: string;
  count: number;
}

export interface MarketplaceBreakdown {
  marketplace: string;
  count: number;
  totalProfit: number;
  averageProfit: number;
  averageMargin: number;
}

// ── Recommendations ─────────────────────────────────────────────────────────

export interface PricingRecommendationResponse {
  overallHealth: 'Healthy' | 'Review' | 'ActionRequired';
  summary: PricingRecommendationSummary;
  recommendations: PricingRecommendation[];
}

export interface PricingRecommendationSummary {
  totalCost: number;
  listingPrice: number;
  actualProfit: number;
  marginPercentage: number;
  desiredProfit: number;
  suggestedListingPrice: number;
  profitToTarget: number;
  targetProfitMin: number;
  targetProfitMax: number;
}

export interface PricingRecommendation {
  type: string;
  severity: 'Critical' | 'Warning' | 'Info';
  title: string;
  message: string;
  suggestedAction: string | null;
}

export interface ProductPricingSummaryRow {
  pricingId: string;
  inventoryVariantId: string;
  marketplace: string;
  color: string;
  size: string;
  sku: string;
  costPrice: number;
  totalCost: number;
  listingPrice: number;
  actualProfit: number;
  marginPercentage: number;
  suggestedSellingPrice: number;
  isOutdated: boolean;
  pricingUpdatedAt: string;
  variantUpdatedAt: string;
}
