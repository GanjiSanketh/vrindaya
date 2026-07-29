import { Injectable, inject } from '@angular/core';
import { MarketplaceBaseService, type DocData } from '../marketplace-base.service';
import type { RetryJob } from './production.models';
import { DEFAULT_RETRY_CONFIG } from './production.models';

@Injectable({ providedIn: 'root' })
export class RetryQueueService extends MarketplaceBaseService<RetryJob> {
  protected readonly collectionName = 'retryJobs';

  protected toModel(id: string, data: DocData): RetryJob {
    return {
      id, originalTaskId: data['originalTaskId'] as string | undefined,
      jobType: (data['jobType'] as string) ?? '', data: data['data'] as unknown ?? {},
      status: (data['status'] as RetryJob['status']) ?? 'pending',
      retryCount: (data['retryCount'] as number) ?? 0,
      maxRetries: (data['maxRetries'] as number) ?? DEFAULT_RETRY_CONFIG.maxRetries,
      lastError: data['lastError'] as string | undefined,
      lastErrorAt: (data['lastErrorAt'] as any)?.toDate?.() as Date | undefined,
      nextRetryAt: (data['nextRetryAt'] as any)?.toDate?.() as Date | undefined,
      deadLetterAt: (data['deadLetterAt'] as any)?.toDate?.() as Date | undefined,
      deadLetterReason: data['deadLetterReason'] as string | undefined,
      createdAt: (data['createdAt'] as any)?.toDate?.() ?? new Date(),
      updatedAt: (data['updatedAt'] as any)?.toDate?.() ?? new Date(),
    };
  }

  async add(jobType: string, data: unknown, originalTaskId?: string): Promise<RetryJob> {
    return this.create({
      jobType, data, originalTaskId,
      status: 'pending', retryCount: 0, maxRetries: DEFAULT_RETRY_CONFIG.maxRetries,
      createdAt: new Date(), updatedAt: new Date(),
    } as any);
  }

  getBackoffDelay(retryCount: number): number {
    const delay = DEFAULT_RETRY_CONFIG.baseDelayMs * Math.pow(2, retryCount);
    return Math.min(delay, DEFAULT_RETRY_CONFIG.maxDelayMs);
  }

  async markRetrying(job: RetryJob): Promise<void> {
    const nextRetryAt = new Date(Date.now() + this.getBackoffDelay(job.retryCount));
    await this.update(job.id!, {
      status: 'pending', retryCount: job.retryCount + 1,
      nextRetryAt, updatedAt: new Date(),
    } as any);
  }

  async markFailed(job: RetryJob, error: string): Promise<void> {
    if (job.retryCount >= job.maxRetries) {
      await this.update(job.id!, {
        status: 'dead_letter', lastError: error, lastErrorAt: new Date(),
        deadLetterAt: new Date(), deadLetterReason: `Exceeded max retries (${job.maxRetries}): ${error}`,
        updatedAt: new Date(),
      } as any);
    } else {
      const nextRetryAt = new Date(Date.now() + this.getBackoffDelay(job.retryCount));
      await this.update(job.id!, {
        status: 'pending', retryCount: job.retryCount + 1,
        lastError: error, lastErrorAt: new Date(), nextRetryAt,
        updatedAt: new Date(),
      } as any);
    }
  }

  async markCompleted(job: RetryJob): Promise<void> {
    await this.update(job.id!, { status: 'completed', updatedAt: new Date() } as any);
  }

  async markDeadLetter(job: RetryJob, reason: string): Promise<void> {
    await this.update(job.id!, {
      status: 'dead_letter', deadLetterAt: new Date(), deadLetterReason: reason,
      updatedAt: new Date(),
    } as any);
  }
}
