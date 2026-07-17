export interface PnLDashboard {
  summary: PnLSummary;
  costs: PnLCostBreakdown;
  monthlySeries: PnLMonthlySeries[];
  yearlySeries: PnLYearlySeries[];
  categoryBreakdown: PnLCategoryBreakdown[];
  supplierBreakdown: PnLSupplierBreakdown[];
  marketplaceBreakdown: PnLMarketplaceBreakdown[];
}

export interface PnLSummary {
  totalRevenue: number;
  totalExpenses: number;
  grossProfit: number;
  netProfit: number;
  inventoryInvestment: number;
  inventoryValue: number;
  expectedProfit: number;
  realizedProfit: number;
}

export interface PnLCostBreakdown {
  packagingCost: number;
  advertisementCost: number;
  marketplaceCharges: number;
  transportationCost: number;
}

export interface PnLMonthlySeries {
  period: string;
  revenue: number;
  expenses: number;
  netProfit: number;
}

export interface PnLYearlySeries {
  period: string;
  revenue: number;
  expenses: number;
  netProfit: number;
}

export interface PnLCategoryBreakdown {
  category: string;
  revenue: number;
  cost: number;
  profit: number;
  count: number;
}

export interface PnLSupplierBreakdown {
  supplierId: string;
  supplierName: string;
  totalPurchases: number;
  purchaseCount: number;
}

export interface PnLMarketplaceBreakdown {
  marketplace: string;
  revenue: number;
  cost: number;
  profit: number;
  margin: number;
  listingCount: number;
}
