import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { MarketplaceProviderFactory } from './marketplace-provider.factory';
import { MarketplaceListingService } from '../marketplace-listing.service';
import { MarketplaceLogService } from '../marketplace-log.service';
import { MarketplaceSyncService } from '../marketplace-sync.service';
import type { IMarketplaceProvider } from './marketplace-provider.interface';
import type { MarketplacePlatformType } from '../../models/marketplace-platform.model';
import type { MarketplaceProduct } from '../../models/marketplace-product.model';
import type { MarketplaceListing } from '../../models/marketplace-listing.model';

@Injectable({ providedIn: 'root' })
export class MarketplaceOperationService {
  private readonly providerFactory = inject(MarketplaceProviderFactory);
  private readonly listingSvc = inject(MarketplaceListingService);
  private readonly logSvc = inject(MarketplaceLogService);
  private readonly syncSvc = inject(MarketplaceSyncService);

  async publish(product: MarketplaceProduct, listing: Partial<MarketplaceListing> & { platform: MarketplacePlatformType }): Promise<MarketplaceListing> {
    const provider = await this.providerFactory.getProvider(listing.platform);
    const result = await firstValueFrom(provider.publish(product, listing));

    const created = await this.listingSvc.create({
      ...listing as any,
      marketplaceProductId: product.id!,
      websiteProductId: product.websiteProductId,
      marketplaceListingId: result.marketplaceListingId,
      listingUrl: result.listingUrl,
      fsn: result.fsn ?? '',
      marketplaceSku: result.sku ?? '',
      listingStatus: 'pending',
      publishStatus: 'published',
      publishedAt: new Date(),
      version: 1,
    });

    await this.syncSvc.createSync(created.id!, product.id!, listing.platform, 'create', 'manual');

    await this.logSvc.add({
      type: 'publish',
      platform: listing.platform,
      marketplaceProductId: product.id,
      marketplaceListingId: created.id,
      message: `Published "${product.name}" to ${listing.platform}`,
      details: `Marketplace ID: ${result.marketplaceListingId}, URL: ${result.listingUrl}`,
    });

    return created;
  }

  async update(listing: MarketplaceListing, changes: Partial<MarketplaceListing>): Promise<void> {
    const provider = await this.providerFactory.getProvider(listing.platform);
    const result = await firstValueFrom(provider.update(listing, changes));

    const now = new Date();
    await this.listingSvc.update(listing.id!, { ...changes, updatedAt: now } as any);

    await this.syncSvc.createSync(listing.id!, listing.marketplaceProductId, listing.platform, 'update', 'manual');

    await this.logSvc.add({
      type: 'update',
      platform: listing.platform,
      marketplaceProductId: listing.marketplaceProductId,
      marketplaceListingId: listing.id,
      message: `Updated listing ${listing.marketplaceSku} on ${listing.platform}`,
      details: `Fields: ${result.updatedFields.join(', ')}`,
    });
  }

  async delete(listing: MarketplaceListing): Promise<void> {
    const provider = await this.providerFactory.getProvider(listing.platform);
    const result = await firstValueFrom(provider.delete(listing));

    if (result.success) {
      await this.listingSvc.delete(listing.id!);

      await this.logSvc.add({
        type: 'delete',
        platform: listing.platform,
        marketplaceProductId: listing.marketplaceProductId,
        marketplaceListingId: listing.id,
        message: `Deleted listing ${listing.marketplaceSku} from ${listing.platform}`,
      });
    }
  }

  async sync(listing: MarketplaceListing): Promise<void> {
    const provider = await this.providerFactory.getProvider(listing.platform);
    const syncRecord = await this.syncSvc.createSync(listing.id!, listing.marketplaceProductId, listing.platform, 'full_sync', 'manual');
    await this.syncSvc.startSync(syncRecord.id!);

    try {
      const result = await firstValueFrom(provider.sync(listing));

      if (result.success) {
        await this.syncSvc.completeSync(syncRecord.id!, { changes: result.changes });
        await this.listingSvc.update(listing.id!, { updatedAt: new Date() } as any);

        await this.logSvc.add({
          type: 'sync',
          platform: listing.platform,
          marketplaceProductId: listing.marketplaceProductId,
          marketplaceListingId: listing.id,
          message: `Sync completed for ${listing.marketplaceSku} on ${listing.platform}`,
          details: `${result.changes.length} field(s) synced`,
        });
      } else {
        await this.syncSvc.failSync(syncRecord.id!, result.errors?.join('; ') ?? 'Sync returned no errors');
      }
    } catch (e) {
      await this.syncSvc.failSync(syncRecord.id!, (e as Error)?.message ?? 'Unknown error');
    }
  }

  async getStatus(platform: MarketplacePlatformType): Promise<{ configured: boolean; name: string }> {
    try {
      const provider = await this.providerFactory.getProvider(platform);
      return { configured: provider.isConfigured(), name: provider.label };
    } catch {
      return { configured: false, name: platform };
    }
  }
}
