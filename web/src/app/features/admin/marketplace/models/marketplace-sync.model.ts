export type SyncAction = 'create' | 'update' | 'delete' | 'publish' | 'unpublish' | 'price_update' | 'stock_update' | 'full_sync';

export type SyncStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';

export type SyncTrigger = 'manual' | 'auto' | 'webhook' | 'scheduled';

export interface MarketplaceSync {
  id?: string;
  marketplaceListingId: string;
  marketplaceProductId: string;
  platform: string;
  action: SyncAction;
  status: SyncStatus;
  trigger: SyncTrigger;
  requestPayload?: Record<string, unknown>;
  responsePayload?: Record<string, unknown>;
  errorMessage?: string;
  errorCode?: string;
  attempts: number;
  maxAttempts: number;
  scheduledAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
