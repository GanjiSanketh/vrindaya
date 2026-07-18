export type InventoryStatus = 'OutOfStock' | 'Critical' | 'Low' | 'Healthy';
export type InventoryStatusFilter = 'all' | 'Low' | 'OutOfStock';

export type StockMovementType = 'Purchase' | 'Sale' | 'Return' | 'Damage' | 'ManualAdjustment' | 'StockCorrection' | 'Transfer';

export const MOVEMENT_TYPE_LABELS: Record<StockMovementType, string> = {
  Purchase: 'Purchase',
  Sale: 'Sale',
  Return: 'Return',
  Damage: 'Damage',
  ManualAdjustment: 'Manual Adjustment',
  StockCorrection: 'Stock Correction',
  Transfer: 'Transfer',
};

/** Every RecordStockMovementRequest-eligible type — Purchase is excluded, it stays exclusively driven by the Purchase Register. */
export const RECORDABLE_MOVEMENT_TYPES: StockMovementType[] = ['Sale', 'Return', 'Damage', 'ManualAdjustment', 'StockCorrection', 'Transfer'];

export type MarketplaceType = 'Website' | 'Flipkart' | 'Amazon' | 'Myntra' | 'Ajio';

export const MARKETPLACE_TYPES: MarketplaceType[] = ['Website', 'Flipkart', 'Amazon', 'Myntra', 'Ajio'];

/** Mirrors the backend's MarketplaceProfileResponse — one per marketplace, nested inside InventoryVariant. */
export interface MarketplaceProfile {
  marketplaceType: MarketplaceType;
  commissionPercent: number;
  manualSellingPriceOverride: number | null;
  effectiveSellingPrice: number;
  suggestedSellingPrice: number;
  totalCost: number;
  profitAmount: number;
  profitPercentage: number;
  margin: number;

  mrp: number;
  sellingPrice: number;
  closingFee: number;
  shippingCharge: number | null;
  packagingCharge: number | null;
  advertisementCost: number | null;
  miscellaneousCharges: number | null;
  expectedSettlement: number;
  netProfit: number;
  marginPercentage: number;
}

/** Mirrors the backend's MarketplaceProfileRequest — only the real inputs; every computed field is always server-recomputed. */
export interface MarketplaceProfileRequest {
  marketplaceType: MarketplaceType;
  commissionPercent: number;
  manualSellingPriceOverride: number | null;

  mrp: number;
  sellingPrice: number;
  closingFee: number;
  shippingCharge: number | null;
  packagingCharge: number | null;
  advertisementCost: number | null;
  miscellaneousCharges: number | null;
}

/**
 * Mirrors the backend's InventoryVariantResponse — the actual unit of stock
 * AND the Pricing Engine, one per (Product, Color, Size). PurchaseCost here
 * is a manual pricing-strategy input, distinct from averagePurchaseCost
 * (auto-computed from actual Confirmed purchases).
 */
export interface InventoryVariant {
  id: string;
  productId: string;
  productName: string | null;
  color: string;
  size: string;
  sku: string;
  barcode: string | null;
  /** Future field — stored, not yet generated or used anywhere. */
  qrCode: string | null;
  supplier: string | null;
  warehouse: string | null;
  averagePurchaseCost: number;
  currentStock: number;
  reservedStock: number;
  soldStock: number;
  returnedStock: number;
  damagedStock: number;
  lowStockThreshold: number;
  criticalStockThreshold: number;
  status: InventoryStatus;

  purchaseCost: number;
  transportationCost: number;
  packagingCost: number;
  advertisingCost: number;
  paymentGatewayChargePercent: number;
  shippingCost: number;
  gstPercent: number;
  miscellaneousCost: number;
  desiredProfitPercent: number;
  marketplaceProfiles: MarketplaceProfile[];

  createdAt: string;
  updatedAt: string;
}

/** Mirrors the backend's UpsertInventoryVariantRequest — PUT .../products/{productId}/variants. */
export interface UpsertInventoryVariantRequest {
  color: string;
  size: string;
  sku: string;
  barcode: string | null;
  qrCode: string | null;
  supplier: string | null;
  warehouse: string | null;
  lowStockThreshold: number;
  criticalStockThreshold: number;

  purchaseCost: number;
  transportationCost: number;
  packagingCost: number;
  advertisingCost: number;
  paymentGatewayChargePercent: number;
  shippingCost: number;
  gstPercent: number;
  miscellaneousCost: number;
  desiredProfitPercent: number;
  marketplaceProfiles: MarketplaceProfileRequest[];
}

export interface BulkUpdateStockThresholdsRequest {
  variantIds: string[];
  lowStockThreshold: number;
  criticalStockThreshold: number;
}

/**
 * Mirrors the backend's RecordStockMovementRequest — PATCH .../variants/{variantId}/movements.
 * Sale/Return/Damage: quantity is a positive count. ManualAdjustment/Transfer: quantity is a signed delta.
 * StockCorrection: newQuantity is the counted total (quantity is ignored).
 */
export interface RecordStockMovementRequest {
  movementType: StockMovementType;
  quantity?: number;
  newQuantity?: number;
  reason: string;
}

/** Mirrors the backend's GetMovements query params — search/dateFrom/dateTo are new, combinable with productId/movementType. */
export interface MovementHistoryFilters {
  productId?: string;
  movementType?: StockMovementType;
  search?: string;
  /** "yyyy-MM-dd" */
  dateFrom?: string;
  /** "yyyy-MM-dd" */
  dateTo?: string;
}

export type PurchaseStatus = 'Draft' | 'Confirmed' | 'Cancelled';

export const PURCHASE_STATUS_OPTIONS: { value: PurchaseStatus; label: string }[] = [
  { value: 'Draft', label: 'Draft' },
  { value: 'Confirmed', label: 'Confirmed' },
  { value: 'Cancelled', label: 'Cancelled' },
];

/** Mirrors the backend's PurchaseEntryItemResponse — Total is always server-computed. */
export interface PurchaseEntryItem {
  productId: string;
  productName: string | null;
  color: string;
  size: string;
  quantity: number;
  purchasePrice: number;
  discount: number;
  gst: number;
  tax: number;
  total: number;
}

/** Mirrors the backend's PurchaseEntryItemRequest — Color/Size required (every unit posts to a specific variant); Total is never sent, the server always recomputes it. */
export interface PurchaseEntryItemRequest {
  productId: string;
  color: string;
  size: string;
  quantity: number;
  purchasePrice: number;
  discount: number;
  gst: number;
  tax: number;
}

/** Mirrors the backend's PurchaseEntryResponse — the purchase HEADER; Items are hydrated from the separate purchaseItems collection server-side. */
export interface PurchaseEntry {
  id: string;
  supplier: string;
  supplierId: string | null;
  invoiceNumber: string;
  invoiceDate: string;
  purchaseDate: string;
  remarks: string | null;
  status: PurchaseStatus;
  items: PurchaseEntryItem[];
  totalAmount: number;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
}

/** Mirrors the backend's CreatePurchaseEntryRequest/UpdatePurchaseEntryRequest (identical shape). */
export interface CreatePurchaseEntryRequest {
  supplier: string;
  supplierId?: string;
  invoiceNumber: string;
  invoiceDate: string;
  purchaseDate: string;
  remarks: string | null;
  status: PurchaseStatus;
  items: PurchaseEntryItemRequest[];
}

export interface StockMovement {
  id: string;
  productId: string;
  productName: string | null;
  color: string | null;
  size: string | null;
  movementType: StockMovementType;
  quantity: number;
  /** Signed — positive means stock increased, negative means it decreased. 0 on movements recorded before this field existed. */
  delta: number;
  reason: string | null;
  referenceType: string | null;
  referenceId: string | null;
  createdBy: string;
  createdAt: string;
}

export interface TimeSeriesPoint {
  /** "yyyy-MM-dd" */
  date: string;
  value: number;
}

export interface NamedValue {
  name: string;
  value: number;
}

/** Mirrors the backend's InventoryDashboardResponse — 10 KPI cards + 6 chart series. */
export interface InventoryDashboard {
  inventoryValue: number;
  currentStock: number;
  lowStockCount: number;
  criticalStockCount: number;
  outOfStockCount: number;
  totalProducts: number;
  totalVariants: number;
  expectedRevenue: number;
  expectedProfit: number;
  todaysPurchases: number;
  todaysStockAdded: number;

  inventoryTrend: TimeSeriesPoint[];
  lowStockTrend: TimeSeriesPoint[];
  purchasesByMonth: NamedValue[];
  topSellingCategories: NamedValue[];
  supplierDistribution: NamedValue[];
  topInventoryValue: NamedValue[];

  recentMovements: StockMovement[];
}

/** Mirrors the backend's InventoryDashboardQuery — all 4 filters are combinable (AND). */
export interface InventoryDashboardFilters {
  category?: string;
  supplierId?: string;
  collectionId?: string;
  /** "yyyy-MM-dd" */
  dateFrom?: string;
  /** "yyyy-MM-dd" */
  dateTo?: string;
}

export interface InventoryForecastRow {
  variantId: string;
  productId: string;
  productName: string;
  category: string;
  color: string;
  size: string;
  sku: string;
  supplier: string | null;

  currentStock: number;
  soldStock: number;
  averageMonthlySales: number;
  dailyConsumptionRate: number;
  estimatedDaysRemaining: number;
  minimumStock: number;
  maximumStock: number;
  idealStock: number;
  recommendedReorderQuantity: number;
  status: string;
  leadTimeDays: number;
}

export interface ForecastFilters {
  status?: string;
  search?: string;
  category?: string;
  supplier?: string;
  cursor?: string;
  pageSize?: number;
}

export interface PagedResult<T> {
  items: T[];
  nextCursor: string | null;
  totalCount: number;
}
