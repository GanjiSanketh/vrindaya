import { Injectable } from '@angular/core';
import type { DocData } from './marketplace-base.service';
import { MarketplaceBaseService } from './marketplace-base.service';
import type { MarketplaceLog, LogType } from '../models/marketplace-log.model';

@Injectable({ providedIn: 'root' })
export class MarketplaceLogService extends MarketplaceBaseService<MarketplaceLog> {
  protected readonly collectionName = 'marketplaceLogs';

  protected toModel(id: string, data: DocData): MarketplaceLog {
    return {
      id,
      type: (data['type'] as LogType) ?? 'info',
      marketplaceProductId: data['marketplaceProductId'] as string | undefined,
      marketplaceListingId: data['marketplaceListingId'] as string | undefined,
      marketplaceSyncId: data['marketplaceSyncId'] as string | undefined,
      platform: (data['platform'] as string) ?? '',
      message: (data['message'] as string) ?? '',
      details: data['details'] as string | undefined,
      metadata: data['metadata'] as Record<string, unknown> | undefined,
      createdBy: data['createdBy'] as string | undefined,
      createdAt: (data['createdAt'] as any)?.toDate?.() ?? new Date(),
      updatedAt: (data['updatedAt'] as any)?.toDate?.() ?? new Date(),
      version: (data['version'] as number) ?? 1,
    };
  }

  async add(data: Omit<MarketplaceLog, 'id' | 'createdAt' | 'updatedAt' | 'version' | 'isArchived'>): Promise<MarketplaceLog> {
    return this.create(data as unknown as Omit<MarketplaceLog, 'id' | 'createdAt' | 'updatedAt' | 'version'>);
  }
}
