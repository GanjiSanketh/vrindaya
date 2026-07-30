import { Injectable, signal } from '@angular/core';
import { MarketplaceBaseService } from '../marketplace-base.service';
import type { DocData } from '../marketplace-base.service';
import type { SyncScope, ConflictStrategy, SyncOpStatus } from './models/sync-comparison.model';

export interface SyncAuditEntry {
  id?: string;
  operationId: string;
  scope: SyncScope;
  platform?: string;
  productId: string;
  listingId: string;
  field: string;
  action: 'synced' | 'skipped' | 'conflict' | 'rolled_back';
  sourceValue: unknown;
  targetValue: unknown;
  conflictStrategy: ConflictStrategy;
  status: SyncOpStatus;
  error?: string;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable({ providedIn: 'root' })
export class SyncAuditService extends MarketplaceBaseService<SyncAuditEntry> {
  protected readonly collectionName = 'syncAudit';

  readonly recentEntries = signal<SyncAuditEntry[]>([]);

  protected toModel(id: string, data: DocData): SyncAuditEntry {
    return {
      id,
      operationId: (data['operationId'] as string) ?? '',
      scope: (data['scope'] as SyncScope) ?? 'one',
      platform: data['platform'] as string | undefined,
      productId: (data['productId'] as string) ?? '',
      listingId: (data['listingId'] as string) ?? '',
      field: (data['field'] as string) ?? '',
      action: (data['action'] as SyncAuditEntry['action']) ?? 'synced',
      sourceValue: data['sourceValue'],
      targetValue: data['targetValue'],
      conflictStrategy: (data['conflictStrategy'] as ConflictStrategy) ?? 'website-wins',
      status: (data['status'] as SyncOpStatus) ?? 'completed',
      error: data['error'] as string | undefined,
      createdBy: data['createdBy'] as string | undefined,
      createdAt: (data['createdAt'] as any)?.toDate?.() ?? new Date(),
      updatedAt: (data['updatedAt'] as any)?.toDate?.() ?? new Date(),
    };
  }

  async log(entry: Omit<SyncAuditEntry, 'id' | 'createdAt' | 'updatedAt'>): Promise<SyncAuditEntry> {
    const now = new Date();
    const created = await this.create({ ...entry, createdAt: now, updatedAt: now } as any);
    this.recentEntries.update(e => [{ ...created }, ...e].slice(0, 50));
    return created;
  }

  async loadRecent(): Promise<void> {
    const result = await this.getAll({ pageSize: 50, sortField: 'createdAt', sortDirection: 'desc' });
    this.recentEntries.set(result.items);
  }
}
