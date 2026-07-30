import { Injectable, inject, signal } from '@angular/core';
import { Timestamp, writeBatch } from 'firebase/firestore';
import type { DocData } from './marketplace-base.service';
import { MarketplaceBaseService } from './marketplace-base.service';
import { MarketplaceLogService } from './marketplace-log.service';
import type { MarketplaceSync, SyncAction, SyncStatus, SyncTrigger } from '../models/marketplace-sync.model';

@Injectable({ providedIn: 'root' })
export class MarketplaceSyncService extends MarketplaceBaseService<MarketplaceSync> {
  protected readonly collectionName = 'marketplaceSyncs';
  private readonly logSvc = inject(MarketplaceLogService);

  readonly syncProgress = signal<{ total: number; completed: number; failed: number }>({ total: 0, completed: 0, failed: 0 });

  protected toModel(id: string, data: DocData): MarketplaceSync {
    return {
      id,
      marketplaceListingId: (data['marketplaceListingId'] as string) ?? '',
      marketplaceProductId: (data['marketplaceProductId'] as string) ?? '',
      platform: (data['platform'] as string) ?? '',
      action: (data['action'] as SyncAction) ?? 'full_sync',
      status: (data['status'] as SyncStatus) ?? 'pending',
      trigger: (data['trigger'] as SyncTrigger) ?? 'manual',
      requestPayload: data['requestPayload'] as Record<string, unknown> | undefined,
      responsePayload: data['responsePayload'] as Record<string, unknown> | undefined,
      errorMessage: data['errorMessage'] as string | undefined,
      errorCode: data['errorCode'] as string | undefined,
      attempts: (data['attempts'] as number) ?? 0,
      maxAttempts: (data['maxAttempts'] as number) ?? 3,
      scheduledAt: (data['scheduledAt'] as any)?.toDate?.() as Date | undefined,
      startedAt: (data['startedAt'] as any)?.toDate?.() as Date | undefined,
      completedAt: (data['completedAt'] as any)?.toDate?.() as Date | undefined,
      createdAt: (data['createdAt'] as any)?.toDate?.() ?? new Date(),
      updatedAt: (data['updatedAt'] as any)?.toDate?.() ?? new Date(),
    };
  }

  async getPendingSyncs(): Promise<MarketplaceSync[]> {
    const result = await this.getAll({
      filters: [{ field: 'status', op: '==', value: 'pending' }],
      sortField: 'createdAt',
      sortDirection: 'asc',
    });
    return result.items;
  }

  async getFailedSyncs(): Promise<MarketplaceSync[]> {
    const result = await this.getAll({
      filters: [{ field: 'status', op: '==', value: 'failed' }],
      sortField: 'updatedAt',
      sortDirection: 'desc',
    });
    return result.items;
  }

  async getByListingId(marketplaceListingId: string): Promise<MarketplaceSync[]> {
    const result = await this.getAll({
      filters: [{ field: 'marketplaceListingId', op: '==', value: marketplaceListingId }],
      sortField: 'createdAt',
      sortDirection: 'desc',
    });
    return result.items;
  }

  async createSync(
    listingId: string,
    productId: string,
    platform: string,
    action: SyncAction,
    trigger: SyncTrigger = 'manual',
  ): Promise<MarketplaceSync> {
    return this.create({
      marketplaceListingId: listingId,
      marketplaceProductId: productId,
      platform,
      action,
      status: 'pending',
      trigger,
      attempts: 0,
      maxAttempts: 3,
    } as unknown as Omit<MarketplaceSync, 'id' | 'createdAt' | 'updatedAt' | 'version'>);
  }

  async startSync(id: string): Promise<MarketplaceSync> {
    return this.update(id, {
      status: 'in_progress',
      startedAt: new Date(),
      attempts: 1,
    } as any);
  }

  async completeSync(id: string, responsePayload?: Record<string, unknown>): Promise<MarketplaceSync> {
    const completed = await this.update(id, {
      status: 'completed',
      completedAt: new Date(),
      responsePayload,
    } as any);
    this.updateProgress('completed');
    return completed;
  }

  async failSync(id: string, errorMessage: string, errorCode?: string): Promise<MarketplaceSync> {
    const sync = await this.getById(id);
    const attempts = (sync?.attempts ?? 0) + 1;
    const maxAttempts = sync?.maxAttempts ?? 3;
    const status: SyncStatus = attempts >= maxAttempts ? 'failed' : 'pending';

    const failed = await this.update(id, {
      status,
      errorMessage,
      errorCode,
      attempts,
      completedAt: status === 'failed' ? new Date() : undefined,
    } as any);

    this.updateProgress('failed');

    await this.logSvc.add({
      type: 'error',
      platform: failed.platform,
      marketplaceSyncId: id,
      marketplaceListingId: failed.marketplaceListingId,
      marketplaceProductId: failed.marketplaceProductId,
      message: `Sync failed: ${errorMessage}`,
      details: `Attempt ${attempts}/${maxAttempts}`,
    });

    return failed;
  }

  async retrySync(id: string): Promise<MarketplaceSync> {
    return this.update(id, {
      status: 'pending',
      errorMessage: null,
      errorCode: null,
      completedAt: null,
    } as any);
  }

  async cancelSync(id: string): Promise<MarketplaceSync> {
    return this.update(id, {
      status: 'cancelled',
      completedAt: new Date(),
    } as any);
  }

  async bulkRetry(ids: string[]): Promise<MarketplaceSync[]> {
    const db = await this.fb.getFirestore();
    const batch = writeBatch(db);
    const ts = Timestamp.fromDate(new Date());
    const nowDate = new Date();
    for (const id of ids) {
      const r = await this.docRef(id);
      batch.update(r, { status: 'pending', errorMessage: null, errorCode: null, completedAt: null, updatedAt: ts });
    }
    await batch.commit();
    this.items.update(items => items.map(i =>
      ids.includes(i.id!) ? { ...i, status: 'pending' as SyncStatus, errorMessage: undefined, errorCode: undefined, completedAt: undefined, updatedAt: nowDate } as unknown as MarketplaceSync : i,
    ));
    return [];
  }

  async bulkCancel(ids: string[]): Promise<MarketplaceSync[]> {
    const db = await this.fb.getFirestore();
    const batch = writeBatch(db);
    const ts = Timestamp.fromDate(new Date());
    const nowDate = new Date();
    for (const id of ids) {
      const r = await this.docRef(id);
      batch.update(r, { status: 'cancelled', completedAt: ts, updatedAt: ts });
    }
    await batch.commit();
    this.items.update(items => items.map(i =>
      ids.includes(i.id!) ? { ...i, status: 'cancelled' as SyncStatus, completedAt: nowDate, updatedAt: nowDate } as unknown as MarketplaceSync : i,
    ));
    return [];
  }

  resetProgress(): void {
    this.syncProgress.set({ total: 0, completed: 0, failed: 0 });
  }

  setSyncTotal(total: number): void {
    this.syncProgress.update(p => ({ ...p, total }));
  }

  private updateProgress(type: 'completed' | 'failed'): void {
    this.syncProgress.update(p => ({
      ...p,
      [type]: p[type] + 1,
    }));
  }
}
