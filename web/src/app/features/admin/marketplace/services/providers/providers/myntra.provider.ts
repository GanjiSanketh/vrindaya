import { Observable, of } from 'rxjs';
import { BaseMarketplaceProvider } from '../base-marketplace.provider';
import type { PublishResult, UpdateResult, DeleteResult, SyncResult, ListingStatusInfo } from '../marketplace-provider.interface';
import type { MarketplacePlatformType } from '../../../models/marketplace-platform.model';
import type { MarketplaceProduct } from '../../../models/marketplace-product.model';
import type { MarketplaceListing } from '../../../models/marketplace-listing.model';

export class MyntraProvider extends BaseMarketplaceProvider {
  readonly platform: MarketplacePlatformType = 'myntra';
  readonly label = 'Myntra';

  getDashboardUrl(): string { return 'https://seller.myntra.com/dashboard'; }
  getCreateListingUrl(): string { return 'https://seller.myntra.com/catalog/add'; }
  getListingUrl(id: string): string { return `https://seller.myntra.com/catalog/products/${id}`; }
  getLoginUrl(): string { return 'https://seller.myntra.com/login'; }

  protected executePublish(product: MarketplaceProduct, listing: Partial<MarketplaceListing>): Observable<PublishResult> {
    const sku = this.buildSku(product, 'myntra');
    return of({
      success: true, marketplaceListingId: `MY-${Date.now()}`, listingUrl: `https://www.myntra.com/product/${Date.now()}`,
      fsn: `FSN-MY-${Date.now()}`, sku, status: 'live', errors: [],
    });
  }

  protected executeUpdate(listing: MarketplaceListing, changes: Partial<MarketplaceListing>): Observable<UpdateResult> {
    const fields = Object.keys(changes).filter(k => k !== 'id' && k !== 'platform');
    return of({ success: true, updatedFields: fields, errors: [] });
  }

  protected executeDelete(listing: MarketplaceListing): Observable<DeleteResult> {
    return of({ success: true, errors: [] });
  }

  protected executeSync(listing: MarketplaceListing): Observable<SyncResult> {
    return of({ success: true, changes: [], errors: [] });
  }

  protected executeGetStatus(listing: MarketplaceListing): Observable<ListingStatusInfo> {
    return of({ status: 'active', published: true, url: listing.listingUrl, lastSyncAt: new Date() });
  }
}
