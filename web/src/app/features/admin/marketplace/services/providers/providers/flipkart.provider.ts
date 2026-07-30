import { Observable, of } from 'rxjs';
import { BaseMarketplaceProvider } from '../base-marketplace.provider';
import type { PublishResult, UpdateResult, DeleteResult, SyncResult, ListingStatusInfo } from '../marketplace-provider.interface';
import type { MarketplacePlatformType } from '../../../models/marketplace-platform.model';
import type { MarketplaceProduct } from '../../../models/marketplace-product.model';
import type { MarketplaceListing } from '../../../models/marketplace-listing.model';

export class FlipkartProvider extends BaseMarketplaceProvider {
  readonly platform: MarketplacePlatformType = 'flipkart';
  readonly label = 'Flipkart';

  getDashboardUrl(): string { return 'https://seller.flipkart.com/dashboard'; }
  getCreateListingUrl(): string { return 'https://seller.flipkart.com/listings/create'; }
  getListingUrl(id: string): string { return `https://seller.flipkart.com/listings/manage?listingId=${id}`; }
  getLoginUrl(): string { return 'https://seller.flipkart.com/login'; }

  protected executePublish(product: MarketplaceProduct, _listing: Partial<MarketplaceListing>): Observable<PublishResult> {
    const sku = this.buildSku(product, 'flipkart');
    return of({
      success: true, marketplaceListingId: `FK-${Date.now()}`, listingUrl: `https://www.flipkart.com/product/p/${Date.now()}`,
      fsn: `FSN-FK-${Date.now()}`, sku, status: 'live', errors: [],
    });
  }

  protected executeUpdate(_listing: MarketplaceListing, changes: Partial<MarketplaceListing>): Observable<UpdateResult> {
    const fields = Object.keys(changes).filter(k => k !== 'id' && k !== 'platform');
    return of({ success: true, updatedFields: fields, errors: [] });
  }

  protected executeDelete(_listing: MarketplaceListing): Observable<DeleteResult> {
    return of({ success: true, errors: [] });
  }

  protected executeSync(_listing: MarketplaceListing): Observable<SyncResult> {
    return of({ success: true, changes: [], errors: [] });
  }

  protected executeGetStatus(listing: MarketplaceListing): Observable<ListingStatusInfo> {
    return of({ status: 'active', published: true, url: listing.listingUrl, lastSyncAt: new Date() });
  }
}
