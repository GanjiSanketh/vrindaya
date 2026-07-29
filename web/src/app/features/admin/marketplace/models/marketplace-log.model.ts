export type LogType = 'info' | 'success' | 'warning' | 'error' | 'sync' | 'create' | 'update' | 'delete' | 'publish' | 'unpublish';

export interface MarketplaceLog {
  id?: string;
  type: LogType;
  marketplaceProductId?: string;
  marketplaceListingId?: string;
  marketplaceSyncId?: string;
  platform: string;
  message: string;
  details?: string;
  metadata?: Record<string, unknown>;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
  version?: number;
}
