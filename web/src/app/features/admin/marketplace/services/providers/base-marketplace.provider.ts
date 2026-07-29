import { Observable, of } from 'rxjs';
import type { IMarketplaceProvider, MarketplaceProviderConfig, PublishResult, UpdateResult, DeleteResult, SyncResult, ListingStatusInfo } from './marketplace-provider.interface';
import type { MarketplacePlatformType, MarketplacePlatformCredentials, MarketplacePlatformConfig } from '../../models/marketplace-platform.model';
import type { MarketplaceProduct } from '../../models/marketplace-product.model';
import type { MarketplaceListing } from '../../models/marketplace-listing.model';

export abstract class BaseMarketplaceProvider implements IMarketplaceProvider {
  abstract readonly platform: MarketplacePlatformType;
  abstract readonly label: string;

  protected credentials!: MarketplacePlatformCredentials;
  protected config!: MarketplacePlatformConfig;
  private configured = false;

  abstract getDashboardUrl(): string;
  abstract getCreateListingUrl(): string;
  abstract getListingUrl(marketplaceListingId: string): string;

  configure(cfg: MarketplaceProviderConfig): void {
    this.credentials = cfg.credentials;
    this.config = cfg.config;
    this.configured = true;
  }

  isConfigured(): boolean {
    return this.configured && !!this.credentials?.apiKey;
  }

  publish(product: MarketplaceProduct, listing: Partial<MarketplaceListing>): Observable<PublishResult> {
    if (!this.isConfigured()) return of({ success: false, marketplaceListingId: '', listingUrl: '', status: 'not_configured', errors: ['Provider not configured'] });
    return this.executePublish(product, listing);
  }

  update(listing: MarketplaceListing, changes: Partial<MarketplaceListing>): Observable<UpdateResult> {
    if (!this.isConfigured()) return of({ success: false, updatedFields: [], errors: ['Provider not configured'] });
    return this.executeUpdate(listing, changes);
  }

  delete(listing: MarketplaceListing): Observable<DeleteResult> {
    if (!this.isConfigured()) return of({ success: false, errors: ['Provider not configured'] });
    return this.executeDelete(listing);
  }

  sync(listing: MarketplaceListing): Observable<SyncResult> {
    if (!this.isConfigured()) return of({ success: false, changes: [], errors: ['Provider not configured'] });
    return this.executeSync(listing);
  }

  getStatus(listing: MarketplaceListing): Observable<ListingStatusInfo> {
    if (!this.isConfigured()) return of({ status: 'unknown', published: false });
    return this.executeGetStatus(listing);
  }

  protected abstract executePublish(product: MarketplaceProduct, listing: Partial<MarketplaceListing>): Observable<PublishResult>;
  protected abstract executeUpdate(listing: MarketplaceListing, changes: Partial<MarketplaceListing>): Observable<UpdateResult>;
  protected abstract executeDelete(listing: MarketplaceListing): Observable<DeleteResult>;
  protected abstract executeSync(listing: MarketplaceListing): Observable<SyncResult>;
  protected abstract executeGetStatus(listing: MarketplaceListing): Observable<ListingStatusInfo>;

  protected buildSku(product: MarketplaceProduct, platform: string): string {
    const prefix = platform.toUpperCase().slice(0, 3);
    const id = product.websiteProductId?.slice(-8) ?? '00000000';
    return `${prefix}-${id}`;
  }
}
