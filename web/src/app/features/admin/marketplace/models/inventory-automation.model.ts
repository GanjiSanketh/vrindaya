export type StockChangeType = 'sale' | 'return' | 'restock' | 'adjustment' | 'damage' | 'reservation' | 'release' | 'sync';

export interface StockLog {
  id?: string;
  listingId: string;
  platform: string;
  marketplaceProductId?: string;
  previousStock: number;
  newStock: number;
  change: number;
  type: StockChangeType;
  warehouseLocation?: string;
  notes?: string;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface InventoryNotification {
  id?: string;
  listingId: string;
  platform: string;
  marketplaceProductId?: string;
  productName: string;
  type: 'low_stock' | 'out_of_stock' | 'restock' | 'buffer_exceeded' | 'sync_failed';
  message: string;
  read: boolean;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type JobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
export type JobType = 'sync_all' | 'sync_platform' | 'sync_listing' | 'check_low_stock' | 'check_buffer' | 'restock';

export interface InventoryJob {
  id?: string;
  type: JobType;
  status: JobStatus;
  platform?: string;
  listingIds?: string[];
  result?: { updated: number; failed: number; details: string };
  error?: string;
  progress: number;
  createdBy?: string;
  scheduledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

export interface InventorySummary {
  totalListings: number;
  totalStock: number;
  totalReserved: number;
  totalIncoming: number;
  lowStockCount: number;
  outOfStockCount: number;
  warehouseCount: number;
  bufferStockCount: number;
}
