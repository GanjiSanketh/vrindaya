import { Injectable, inject } from '@angular/core';
import { Timestamp, writeBatch } from 'firebase/firestore';
import type { DocData } from './marketplace-base.service';
import { MarketplaceBaseService } from './marketplace-base.service';
import { MarketplaceLogService } from './marketplace-log.service';
import type { MarketplaceListing, ListingStatus, AiStatus, FulfillmentType } from '../models/marketplace-listing.model';
import type { MarketplacePlatformType, PublishStatus } from '../models/marketplace-platform.model';
import type { MarketplacePricing } from '../models/marketplace-pricing.model';
import type { MarketplaceInventory } from '../models/marketplace-inventory.model';

@Injectable({ providedIn: 'root' })
export class MarketplaceListingService extends MarketplaceBaseService<MarketplaceListing> {
  protected readonly collectionName = 'marketplaceListings';
  private readonly logSvc = inject(MarketplaceLogService);

  protected toModel(id: string, data: DocData): MarketplaceListing {
    return {
      id,
      marketplaceProductId: (data['marketplaceProductId'] as string) ?? '',
      websiteProductId: (data['websiteProductId'] as string) ?? '',
      platform: (data['platform'] as MarketplacePlatformType) ?? 'other',
      marketplaceTitle: (data['marketplaceTitle'] as string) ?? '',
      marketplaceDescription: (data['marketplaceDescription'] as string) ?? '',
      listingStatus: (data['listingStatus'] as ListingStatus) ?? 'draft',
      marketplaceSku: (data['marketplaceSku'] as string) ?? '',
      sellerSku: (data['sellerSku'] as string) ?? '',
      listingUrl: (data['listingUrl'] as string) ?? '',
      fsn: (data['fsn'] as string) ?? '',
      marketplaceListingId: (data['marketplaceListingId'] as string) ?? '',
      pricing: (data['pricing'] as MarketplacePricing) ?? { mrp: 0, sellingPrice: 0, discountPercent: 0, taxRate: 0, taxInclusive: true, shippingCharge: 0, currency: 'INR', createdAt: new Date(), updatedAt: new Date() },
      inventory: (data['inventory'] as MarketplaceInventory) ?? { totalStock: 0, availableStock: 0, reservedStock: 0, damagedStock: 0, incomingStock: 0, lowStockThreshold: 5, stockStatus: 'out_of_stock', fulfillmentType: 'self', createdAt: new Date(), updatedAt: new Date() },
      aiStatus: (data['aiStatus'] as AiStatus) ?? 'not_applicable',
      publishStatus: (data['publishStatus'] as PublishStatus) ?? 'draft',
      fulfillmentType: (data['fulfillmentType'] as FulfillmentType) ?? 'self',
      handlingTimeDays: (data['handlingTimeDays'] as number) ?? 2,
      returnPolicy: (data['returnPolicy'] as string) ?? '',
      shippingWeight: (data['shippingWeight'] as number) ?? 0,
      shippingWeightUnit: (data['shippingWeightUnit'] as 'g' | 'kg' | 'lb') ?? 'g',
      version: (data['version'] as number) ?? 1,
      createdBy: data['createdBy'] as string | undefined,
      updatedBy: data['updatedBy'] as string | undefined,
      publishedAt: (data['publishedAt'] as any)?.toDate?.() as Date | undefined,
      createdAt: (data['createdAt'] as any)?.toDate?.() ?? new Date(),
      updatedAt: (data['updatedAt'] as any)?.toDate?.() ?? new Date(),
    };
  }

  async getByProductId(marketplaceProductId: string): Promise<MarketplaceListing[]> {
    const result = await this.getAll({
      filters: [{ field: 'marketplaceProductId', op: '==', value: marketplaceProductId }],
    });
    return result.items;
  }

  async getByWebsiteProductId(websiteProductId: string): Promise<MarketplaceListing[]> {
    const result = await this.getAll({
      filters: [{ field: 'websiteProductId', op: '==', value: websiteProductId }],
    });
    return result.items;
  }

  async getByPlatform(platform: MarketplacePlatformType): Promise<MarketplaceListing[]> {
    const result = await this.getAll({
      filters: [{ field: 'platform', op: '==', value: platform }],
    });
    return result.items;
  }

  async getActiveListings(): Promise<MarketplaceListing[]> {
    const result = await this.getAll({
      filters: [{ field: 'listingStatus', op: '==', value: 'active' }],
    });
    return result.items;
  }

  async updatePricing(id: string, pricing: MarketplacePricing): Promise<MarketplaceListing> {
    const updated = await this.update(id, { pricing } as any);
    await this.logSvc.add({
      type: 'update',
      platform: updated.platform,
      marketplaceListingId: id,
      marketplaceProductId: updated.marketplaceProductId,
      message: `Pricing updated for ${updated.marketplaceSku}`,
      details: `MRP: ${pricing.mrp}, Selling: ${pricing.sellingPrice}`,
    });
    return updated;
  }

  async updateInventory(id: string, inventory: Partial<MarketplaceInventory>): Promise<MarketplaceListing> {
    const listing = await this.getById(id);
    if (!listing) throw new Error('Listing not found');
    return this.update(id, { inventory: { ...listing.inventory, ...inventory } } as any);
  }

  async updateListingStatus(id: string, status: ListingStatus): Promise<MarketplaceListing> {
    const updated = await this.update(id, { listingStatus: status } as any);
    await this.logSvc.add({
      type: status === 'active' ? 'publish' : 'update',
      platform: updated.platform,
      marketplaceListingId: id,
      marketplaceProductId: updated.marketplaceProductId,
      message: `Listing ${status} for ${updated.marketplaceSku}`,
    });
    return updated;
  }

  async updatePublishStatus(id: string, status: PublishStatus): Promise<MarketplaceListing> {
    const now = new Date();
    return this.update(id, {
      publishStatus: status,
      publishedAt: status === 'published' ? now : undefined,
    } as any);
  }

  async bulkPublish(ids: string[]): Promise<MarketplaceListing[]> {
    const db = await this.fb.getFirestore();
    const batch = writeBatch(db);
    const ts = Timestamp.fromDate(new Date());
    const nowDate = new Date();
    for (const id of ids) {
      const r = await this.docRef(id);
      batch.update(r, { publishStatus: 'published', publishedAt: ts, updatedAt: ts });
    }
    await batch.commit();
    this.items.update(items => items.map(i =>
      ids.includes(i.id!) ? { ...i, publishStatus: 'published', publishedAt: nowDate, updatedAt: nowDate } as unknown as MarketplaceListing : i,
    ));
    return [];
  }

  async bulkUnpublish(ids: string[]): Promise<MarketplaceListing[]> {
    const db = await this.fb.getFirestore();
    const batch = writeBatch(db);
    const ts = Timestamp.fromDate(new Date());
    const nowDate = new Date();
    for (const id of ids) {
      const r = await this.docRef(id);
      batch.update(r, { publishStatus: 'unpublished', updatedAt: ts });
    }
    await batch.commit();
    this.items.update(items => items.map(i =>
      ids.includes(i.id!) ? { ...i, publishStatus: 'unpublished', updatedAt: nowDate } as unknown as MarketplaceListing : i,
    ));
    return [];
  }
}
