export type AutomationAction = 'create' | 'update_price' | 'update_stock' | 'update_images' | 'update_description' | 'delete';
export type AutomationStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface AutomationTask {
  id?: string;
  platform: string;
  action: AutomationAction;
  marketplaceProductId?: string;
  marketplaceListingId?: string;
  data: Record<string, unknown>;
  status: AutomationStatus;
  priority: number;
  retryCount: number;
  maxRetries: number;
  result?: {
    listingUrl: string;
    marketplaceId: string;
    fsn: string;
    marketplaceStatus: string;
  };
  error?: string;
  createdBy?: string;
  scheduledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export const TASK_DEFAULTS = {
  priority: 0,
  retryCount: 0,
  maxRetries: 3,
};
