import { Injectable, inject } from '@angular/core';
import { MarketplaceBaseService } from '../marketplace-base.service';
import { MarketplaceLogService } from '../marketplace-log.service';
import type { DocData } from '../marketplace-base.service';
import type { AutomationTask, AutomationAction, AutomationStatus } from './models/automation-task.model';

@Injectable({ providedIn: 'root' })
export class AutomationQueueService extends MarketplaceBaseService<AutomationTask> {
  protected readonly collectionName = 'automationQueue';
  private readonly logSvc = inject(MarketplaceLogService);

  protected toModel(id: string, data: DocData): AutomationTask {
    return {
      id,
      platform: (data['platform'] as string) ?? '',
      action: (data['action'] as AutomationAction) ?? 'create',
      marketplaceProductId: data['marketplaceProductId'] as string | undefined,
      marketplaceListingId: data['marketplaceListingId'] as string | undefined,
      data: (data['data'] as Record<string, unknown>) ?? {},
      status: (data['status'] as AutomationStatus) ?? 'queued',
      priority: (data['priority'] as number) ?? 0,
      retryCount: (data['retryCount'] as number) ?? 0,
      maxRetries: (data['maxRetries'] as number) ?? 3,
      result: data['result'] as AutomationTask['result'] | undefined,
      error: data['error'] as string | undefined,
      createdBy: data['createdBy'] as string | undefined,
      createdAt: (data['createdAt'] as any)?.toDate?.() ?? new Date(),
      updatedAt: (data['updatedAt'] as any)?.toDate?.() ?? new Date(),
    };
  }

  async enqueue(
    platform: string,
    action: AutomationAction,
    payload: { marketplaceProductId?: string; marketplaceListingId?: string; data: Record<string, unknown> },
  ): Promise<AutomationTask> {
    const { id, ...rest } = await this.create({
      platform,
      action,
      marketplaceProductId: payload.marketplaceProductId,
      marketplaceListingId: payload.marketplaceListingId,
      data: payload.data,
      status: 'queued',
      priority: 0,
      retryCount: 0,
      maxRetries: 3,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);
    await this.logSvc.add({
      type: 'info', platform, message: `${action} task queued for ${platform}`,
      marketplaceProductId: payload.marketplaceProductId, marketplaceListingId: payload.marketplaceListingId,
    });
    return { id, ...rest } as AutomationTask;
  }

  async markRunning(id: string): Promise<void> {
    await this.update(id, { status: 'running', updatedAt: new Date() } as any);
  }

  async markCompleted(id: string, result: AutomationTask['result']): Promise<void> {
    await this.update(id, { status: 'completed', result, updatedAt: new Date() } as any);
  }

  async markFailed(id: string, error: string): Promise<void> {
    const task = await this.getById(id);
    const retryCount = (task?.retryCount ?? 0) + 1;
    const maxRetries = task?.maxRetries ?? 3;
    if (retryCount >= maxRetries) {
      await this.update(id, { status: 'failed', retryCount, error, updatedAt: new Date() } as any);
    } else {
      await this.update(id, { status: 'queued', retryCount, error, updatedAt: new Date() } as any);
    }
    await this.logSvc.add({
      type: 'error', platform: task?.platform ?? '', message: `Task failed: ${error}`,
      marketplaceProductId: task?.marketplaceProductId, marketplaceListingId: task?.marketplaceListingId,
    });
  }

  async cancel(id: string): Promise<void> {
    await this.update(id, { status: 'cancelled', updatedAt: new Date() } as any);
  }
}
