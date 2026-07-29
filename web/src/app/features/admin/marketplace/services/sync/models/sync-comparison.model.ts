export type SyncField = 'price' | 'stock' | 'images' | 'description' | 'seo' | 'attributes' | 'title';
export type DiffStatus = 'mismatch' | 'missing' | 'extra';
export type ConflictStrategy = 'website-wins' | 'marketplace-wins' | 'skip' | 'manual';
export type SyncScope = 'one' | 'many' | 'all';
export type SyncOpStatus = 'pending' | 'syncing' | 'completed' | 'failed' | 'rolled_back';

export interface FieldDiff {
  field: SyncField;
  label: string;
  sourceValue: unknown;
  targetValue: unknown;
  status: DiffStatus;
}

export interface ListingComparison {
  listingId: string;
  productId: string;
  websiteProductId: string;
  platform: string;
  diffs: FieldDiff[];
  hasChanges: boolean;
}

export interface SyncSnapshot {
  pricing?: Record<string, unknown>;
  inventory?: Record<string, unknown>;
  marketplaceTitle?: string;
  marketplaceDescription?: string;
}

export interface SyncOperation {
  id?: string;
  scope: SyncScope;
  platform?: string;
  productIds: string[];
  comparisons: ListingComparison[];
  totalDiffs: number;
  conflictStrategy: ConflictStrategy;
  status: SyncOpStatus;
  snapshot: Record<string, SyncSnapshot>;
  error?: string;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}
