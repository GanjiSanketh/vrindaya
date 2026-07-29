import { Injectable } from '@angular/core';
import type { DocData } from './marketplace-base.service';
import { MarketplaceBaseService } from './marketplace-base.service';
import type { MarketplacePlatform, MarketplacePlatformType } from '../models/marketplace-platform.model';

@Injectable({ providedIn: 'root' })
export class MarketplaceService extends MarketplaceBaseService<MarketplacePlatform> {
  protected readonly collectionName = 'marketplacePlatforms';

  protected toModel(id: string, data: DocData): MarketplacePlatform {
    return {
      id,
      name: (data['name'] as MarketplacePlatformType) ?? 'other',
      label: (data['label'] as string) ?? '',
      enabled: (data['enabled'] as boolean) ?? false,
      credentials: (data['credentials'] as any) ?? { apiKey: '', apiSecret: '', sellerId: '' },
      config: (data['config'] as any) ?? { autoSync: false, syncIntervalMinutes: 60, defaultPublishStatus: 'draft', defaultReturnPolicy: '', shippingConfig: { freeShippingAbove: 0, shippingCharge: 0, handlingTimeDays: 2 } },
      createdAt: (data['createdAt'] as any)?.toDate?.() ?? new Date(),
      updatedAt: (data['updatedAt'] as any)?.toDate?.() ?? new Date(),
    };
  }

  async getEnabledPlatforms(): Promise<MarketplacePlatform[]> {
    const result = await this.getAll({
      filters: [{ field: 'enabled', op: '==', value: true }],
      sortField: 'label',
      sortDirection: 'asc',
    });
    return result.items;
  }

  async toggleEnabled(id: string, enabled: boolean): Promise<MarketplacePlatform> {
    return this.update(id, { enabled } as any);
  }

  async updateCredentials(id: string, credentials: MarketplacePlatform['credentials']): Promise<MarketplacePlatform> {
    return this.update(id, { credentials } as any);
  }

  async updateConfig(id: string, config: Partial<MarketplacePlatform['config']>): Promise<MarketplacePlatform> {
    const platform = await this.getById(id);
    if (!platform) throw new Error('Platform not found');
    return this.update(id, { config: { ...platform.config, ...config } } as any);
  }
}
