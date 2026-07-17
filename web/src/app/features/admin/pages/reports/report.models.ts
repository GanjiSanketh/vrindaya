export type ReportType =
  | 'inventory-valuation'
  | 'stock-summary'
  | 'supplier'
  | 'purchase'
  | 'dead-stock'
  | 'low-stock'
  | 'movement';

export const REPORT_TYPES: { value: ReportType; label: string; description: string }[] = [
  { value: 'inventory-valuation', label: 'Inventory Valuation', description: 'Stock value per variant by average cost' },
  { value: 'stock-summary', label: 'Stock Summary', description: 'Aggregated stock quantities by product' },
  { value: 'supplier', label: 'Supplier Report', description: 'Purchase activity grouped by supplier' },
  { value: 'purchase', label: 'Purchase Report', description: 'Detailed purchase line items' },
  { value: 'dead-stock', label: 'Dead Stock Report', description: 'Variants with stock but no recent movement' },
  { value: 'low-stock', label: 'Low Stock Report', description: 'Variants below alert thresholds' },
  { value: 'movement', label: 'Movement Report', description: 'All stock movement activity' },
];

export interface ReportQuery {
  dateFrom?: string;
  dateTo?: string;
  categoryId?: string;
  supplierId?: string;
  productId?: string;
  collectionId?: string;
  search?: string;
  sortBy?: string;
  sortDesc?: boolean;
  page: number;
  pageSize: number;
}

export interface InventoryValuationRow {
  productId: string;
  productName: string | null;
  category: string | null;
  color: string;
  size: string;
  sku: string;
  currentStock: number;
  averageCost: number;
  stockValue: number;
  sellingPrice: number | null;
  profitMargin: number | null;
  status: string;
}

export interface StockSummaryRow {
  productId: string;
  productName: string | null;
  category: string | null;
  variantCount: number;
  totalStock: number;
  reservedStock: number;
  soldStock: number;
  returnedStock: number;
  damagedStock: number;
  averageCost: number;
  totalValue: number;
}

export interface SupplierReportRow {
  supplierId: string | null;
  supplierName: string;
  totalPurchases: number;
  totalAmount: number;
  lastPurchaseDate: string | null;
}

export interface PurchaseReportRow {
  entryId: string;
  purchaseDate: string;
  invoiceNumber: string;
  supplier: string;
  productName: string | null;
  color: string | null;
  size: string | null;
  quantity: number;
  purchasePrice: number;
  discount: number;
  gst: number;
  total: number;
  status: string;
}

export interface DeadStockRow {
  variantId: string;
  productId: string;
  productName: string | null;
  color: string;
  size: string;
  sku: string;
  currentStock: number;
  stockValue: number;
  lastMovementDate: string | null;
  daysSinceLastMovement: number;
}

export interface LowStockReportRow {
  variantId: string;
  productId: string;
  productName: string | null;
  color: string;
  size: string;
  sku: string;
  currentStock: number;
  reservedStock: number;
  lowStockThreshold: number;
  criticalStockThreshold: number;
  status: string;
}

export interface MovementReportRow {
  movementId: string;
  createdAt: string;
  productName: string | null;
  color: string | null;
  size: string | null;
  sku: string;
  movementType: string;
  quantity: number;
  delta: number;
  reason: string | null;
  createdBy: string;
}
