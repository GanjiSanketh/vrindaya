export type StockStatus = 'in_stock' | 'out_of_stock' | 'low_stock' | 'backorder' | 'discontinued';

export interface MarketplaceInventory {
  totalStock: number;
  availableStock: number;
  reservedStock: number;
  damagedStock: number;
  incomingStock: number;
  lowStockThreshold: number;
  stockStatus: StockStatus;
  warehouseLocation?: string;
  fulfillmentType: 'self' | 'marketplace_fba' | 'dropship';
  estimatedRestockDate?: Date;
  lastCountedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
