import { Observable } from 'rxjs';
import type { MarketplacePlatformType } from '../../models/marketplace-platform.model';
import type { MarketplacePlatformCredentials, MarketplacePlatformConfig } from '../../models/marketplace-platform.model';
import type { MarketplaceProduct } from '../../models/marketplace-product.model';
import type { MarketplaceListing } from '../../models/marketplace-listing.model';

export interface PublishResult {
  success: boolean;
  marketplaceListingId: string;
  listingUrl: string;
  fsn?: string;
  sku?: string;
  status: string;
  errors?: string[];
}

export interface UpdateResult {
  success: boolean;
  updatedFields: string[];
  errors?: string[];
}

export interface DeleteResult {
  success: boolean;
  errors?: string[];
}

export interface SyncResult {
  success: boolean;
  changes: { field: string; localValue: unknown; remoteValue: unknown }[];
  errors?: string[];
}

export interface ListingStatusInfo {
  status: string;
  published: boolean;
  url?: string;
  lastSyncAt?: Date;
}

export interface MarketplaceProviderConfig {
  credentials: MarketplacePlatformCredentials;
  config: MarketplacePlatformConfig;
}

export interface IMarketplaceProvider {
  readonly platform: MarketplacePlatformType;
  readonly label: string;

  configure(config: MarketplaceProviderConfig): void;
  isConfigured(): boolean;

  publish(product: MarketplaceProduct, listing: Partial<MarketplaceListing>): Observable<PublishResult>;
  update(listing: MarketplaceListing, changes: Partial<MarketplaceListing>): Observable<UpdateResult>;
  delete(listing: MarketplaceListing): Observable<DeleteResult>;
  sync(listing: MarketplaceListing): Observable<SyncResult>;
  getStatus(listing: MarketplaceListing): Observable<ListingStatusInfo>;

  getDashboardUrl(): string;
  getCreateListingUrl(): string;
  getListingUrl(marketplaceListingId: string): string;
}
