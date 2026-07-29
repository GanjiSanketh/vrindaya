import { Injectable, inject } from '@angular/core';
import { AutomationQueueService } from './automation-queue.service';
import { AutomationSchedulerService } from './automation-scheduler.service';
import type { AutomationTask, AutomationAction } from './models/automation-task.model';

@Injectable({ providedIn: 'root' })
export class AutomationService {
  private readonly queueSvc = inject(AutomationQueueService);
  private readonly scheduler = inject(AutomationSchedulerService);

  readonly tasks = this.queueSvc.items;
  readonly loading = this.queueSvc.loading;
  readonly schedules = this.scheduler.schedules;

  async createListing(platform: string, data: Record<string, unknown>): Promise<AutomationTask> {
    return this.queueSvc.enqueue(platform, 'create', { data });
  }

  async updatePrice(platform: string, listingId: string, price: number): Promise<AutomationTask> {
    return this.queueSvc.enqueue(platform, 'update_price', { marketplaceListingId: listingId, data: { price } });
  }

  async updateStock(platform: string, listingId: string, stock: number): Promise<AutomationTask> {
    return this.queueSvc.enqueue(platform, 'update_stock', { marketplaceListingId: listingId, data: { stock } });
  }

  async updateImages(platform: string, listingId: string, imageUrls: string[]): Promise<AutomationTask> {
    return this.queueSvc.enqueue(platform, 'update_images', { marketplaceListingId: listingId, data: { images: imageUrls } });
  }

  async updateDescription(platform: string, listingId: string, description: string): Promise<AutomationTask> {
    return this.queueSvc.enqueue(platform, 'update_description', { marketplaceListingId: listingId, data: { description } });
  }

  async deleteListing(platform: string, listingId: string): Promise<AutomationTask> {
    return this.queueSvc.enqueue(platform, 'delete', { marketplaceListingId: listingId, data: {} });
  }

  async retryTask(taskId: string): Promise<void> {
    const task = await this.queueSvc.getById(taskId);
    if (!task || task.status !== 'failed') return;
    await this.queueSvc.update(taskId, {
      status: 'queued', retryCount: 0, error: null, updatedAt: new Date(),
    } as any);
  }

  async retryAllFailed(): Promise<number> {
    const result = await this.queueSvc.getAll({
      filters: [{ field: 'status', op: '==', value: 'failed' }],
      pageSize: 100,
    });
    let count = 0;
    for (const task of result.items) {
      if (task.id) {
        await this.retryTask(task.id);
        count++;
      }
    }
    return count;
  }

  async scheduleTask(platform: string, action: AutomationAction, label: string, cron: string, payload: Record<string, unknown>): Promise<void> {
    this.scheduler.add({ platform, action, label, cron, enabled: true, payload });
  }

  async cancelTask(taskId: string): Promise<void> {
    return this.queueSvc.cancel(taskId);
  }

  async loadTasks(): Promise<void> {
    await this.queueSvc.getAll({ pageSize: 100, sortField: 'createdAt', sortDirection: 'desc' });
  }
}
