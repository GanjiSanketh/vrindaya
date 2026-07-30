import { Injectable } from '@angular/core';
import { MarketplaceBaseService, type DocData } from '../marketplace-base.service';
import type { AuditEntry, AuditAction, AuditSeverity, AuditStatus } from './production.models';

@Injectable({ providedIn: 'root' })
export class AuditTrailService extends MarketplaceBaseService<AuditEntry> {
  protected readonly collectionName = 'auditTrail';

  protected toModel(id: string, data: DocData): AuditEntry {
    return {
      id, action: data['action'] as AuditAction, severity: (data['severity'] as AuditSeverity) ?? 'info',
      status: (data['status'] as AuditStatus) ?? 'success', collection: (data['collection'] as string) ?? '',
      documentId: data['documentId'] as string | undefined, documentIds: data['documentIds'] as string[] | undefined,
      previousData: data['previousData'] as Record<string, unknown> | undefined,
      newData: data['newData'] as Record<string, unknown> | undefined,
      changedFields: data['changedFields'] as string[] | undefined,
      performedBy: data['performedBy'] as string | undefined,
      performedByRole: data['performedByRole'] as string | undefined,
      ipAddress: data['ipAddress'] as string | undefined, userAgent: data['userAgent'] as string | undefined,
      duration: data['duration'] as number | undefined, errorMessage: data['errorMessage'] as string | undefined,
      metadata: data['metadata'] as Record<string, unknown> | undefined,
      createdAt: (data['createdAt'] as any)?.toDate?.() ?? new Date(),
      updatedAt: (data['updatedAt'] as any)?.toDate?.() ?? new Date(),
    };
  }

  async record(opts: {
    action: AuditAction; collection: string; severity?: AuditSeverity; status?: AuditStatus;
    documentId?: string; documentIds?: string[]; previousData?: Record<string, unknown>;
    newData?: Record<string, unknown>; changedFields?: string[]; performedBy?: string;
    performedByRole?: string; duration?: number; errorMessage?: string; metadata?: Record<string, unknown>;
  }): Promise<AuditEntry> {
    return this.create({
      action: opts.action, severity: opts.severity ?? 'info', status: opts.status ?? 'success',
      collection: opts.collection, documentId: opts.documentId, documentIds: opts.documentIds,
      previousData: opts.previousData, newData: opts.newData, changedFields: opts.changedFields,
      performedBy: opts.performedBy, performedByRole: opts.performedByRole,
      duration: opts.duration, errorMessage: opts.errorMessage, metadata: opts.metadata,
      createdAt: new Date(), updatedAt: new Date(),
    } as any);
  }
}
