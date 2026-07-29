import { Injectable, signal, inject } from '@angular/core';
import { MarketplaceBaseService, type DocData } from '../marketplace-base.service';
import type { BackgroundJob } from './production.models';
import { PerfMonitorService } from './perf-monitor.service';
import { RequestLoggerService } from './request-logger.service';

@Injectable({ providedIn: 'root' })
export class BackgroundQueueService extends MarketplaceBaseService<BackgroundJob> {
  protected readonly collectionName = 'backgroundJobs';

  protected toModel(id: string, data: DocData): BackgroundJob {
    return {
      id, name: (data['name'] as string) ?? '', type: (data['type'] as BackgroundJob['type']) ?? 'custom',
      data: (data['data'] as Record<string, unknown>) ?? {},
      status: (data['status'] as BackgroundJob['status']) ?? 'queued',
      priority: (data['priority'] as number) ?? 0, progress: (data['progress'] as number) ?? 0,
      result: data['result'] as Record<string, unknown> | undefined,
      error: data['error'] as string | undefined,
      scheduledAt: (data['scheduledAt'] as any)?.toDate?.() as Date | undefined,
      startedAt: (data['startedAt'] as any)?.toDate?.() as Date | undefined,
      completedAt: (data['completedAt'] as any)?.toDate?.() as Date | undefined,
      concurrencyGroup: data['concurrencyGroup'] as string | undefined,
      createdBy: data['createdBy'] as string | undefined,
      createdAt: (data['createdAt'] as any)?.toDate?.() ?? new Date(),
      updatedAt: (data['updatedAt'] as any)?.toDate?.() ?? new Date(),
    };
  }

  async enqueue(opts: { name: string; type: BackgroundJob['type']; data: Record<string, unknown>; priority?: number; scheduledAt?: Date; concurrencyGroup?: string; createdBy?: string }): Promise<BackgroundJob> {
    return this.create({
      name: opts.name, type: opts.type, data: opts.data,
      priority: opts.priority ?? 0, scheduledAt: opts.scheduledAt,
      concurrencyGroup: opts.concurrencyGroup, createdBy: opts.createdBy,
      status: 'queued', progress: 0, createdAt: new Date(), updatedAt: new Date(),
    } as any);
  }

  async markRunning(id: string): Promise<void> {
    await this.update(id, { status: 'running', startedAt: new Date() } as any);
  }

  async markProgress(id: string, progress: number): Promise<void> {
    await this.update(id, { progress } as any);
  }

  async markCompleted(id: string, result?: Record<string, unknown>): Promise<void> {
    await this.update(id, { status: 'completed', progress: 100, result, completedAt: new Date() } as any);
  }

  async markFailed(id: string, error: string): Promise<void> {
    await this.update(id, { status: 'failed', error } as any);
  }

  async cancel(id: string): Promise<void> {
    await this.update(id, { status: 'cancelled' } as any);
  }
}
