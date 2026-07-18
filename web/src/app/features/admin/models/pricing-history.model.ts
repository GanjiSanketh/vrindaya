export interface PricingHistoryRow {
  id: string;
  pricingId: string;
  inventoryVariantId: string;
  marketplace: string;
  oldListingPrice: number;
  newListingPrice: number;
  oldProfit: number;
  newProfit: number;
  changedBy: string;
  reason: string;
  timestamp: string;
}

export interface PricingHistoryQuery {
  fromDate?: string;
  toDate?: string;
  cursor?: string;
  pageSize?: number;
}
