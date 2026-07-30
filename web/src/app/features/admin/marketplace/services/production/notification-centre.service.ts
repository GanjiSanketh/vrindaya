import { Injectable, signal, computed, inject } from '@angular/core';
import { MarketplaceBaseService, type DocData } from '../marketplace-base.service';
import { MarketplaceLogService } from '../marketplace-log.service';
import type { Notification as NotificationModel, UserRole } from './production.models';

@Injectable({ providedIn: 'root' })
export class NotificationDataService extends MarketplaceBaseService<NotificationModel> {
  protected readonly collectionName = 'notifications';

  protected toModel(id: string, data: DocData): NotificationModel {
    return {
      id, title: (data['title'] as string) ?? '', message: (data['message'] as string) ?? '',
      type: (data['type'] as NotificationModel['type']) ?? 'info',
      category: (data['category'] as NotificationModel['category']) ?? 'system',
      read: (data['read'] as boolean) ?? false, dismissed: (data['dismissed'] as boolean) ?? false,
      actionUrl: data['actionUrl'] as string | undefined,
      actionLabel: data['actionLabel'] as string | undefined,
      sourceId: data['sourceId'] as string | undefined,
      sourceCollection: data['sourceCollection'] as string | undefined,
      expiresAt: (data['expiresAt'] as any)?.toDate?.() as Date | undefined,
      recipientId: data['recipientId'] as string | undefined,
      recipientRole: data['recipientRole'] as UserRole | undefined,
      createdAt: (data['createdAt'] as any)?.toDate?.() ?? new Date(),
      updatedAt: (data['updatedAt'] as any)?.toDate?.() ?? new Date(),
    };
  }

  async markRead(id: string): Promise<void> {
    await this.update(id, { read: true } as any);
  }

  async markAllRead(): Promise<void> {
    const result = await this.getAll({ filters: [{ field: 'read', op: '==', value: false }], pageSize: 100 });
    for (const n of result.items) {
      if (n.id) await this.update(n.id, { read: true } as any);
    }
  }
}

@Injectable({ providedIn: 'root' })
export class NotificationCentreService {
  private readonly dataSvc = inject(NotificationDataService);
  private readonly logSvc = inject(MarketplaceLogService);

  readonly notifications = signal<NotificationModel[]>([]);
  readonly loading = signal(false);
  readonly unreadCount = computed(() => this.notifications().filter(n => !n.read).length);

  async load(): Promise<void> {
    this.loading.set(true);
    try {
      const result = await this.dataSvc.getAll({ pageSize: 100, sortField: 'createdAt', sortDirection: 'desc' });
      this.notifications.set(result.items);
    } finally {
      this.loading.set(false);
    }
  }

  async notify(opts: {
    title: string; message: string; type?: NotificationModel['type']; category?: NotificationModel['category'];
    actionUrl?: string; actionLabel?: string; sourceId?: string; sourceCollection?: string;
    recipientId?: string; recipientRole?: UserRole; expiresInMs?: number;
  }): Promise<NotificationModel> {
    const notif = await this.dataSvc.create({
      title: opts.title, message: opts.message,
      type: opts.type ?? 'info', category: opts.category ?? 'system',
      read: false, dismissed: false,
      actionUrl: opts.actionUrl, actionLabel: opts.actionLabel,
      sourceId: opts.sourceId, sourceCollection: opts.sourceCollection,
      recipientId: opts.recipientId, recipientRole: opts.recipientRole,
      expiresAt: opts.expiresInMs ? new Date(Date.now() + opts.expiresInMs) : undefined,
      createdAt: new Date(), updatedAt: new Date(),
    } as any);
    this.notifications.update(n => [notif, ...n]);
    const logType = opts.type === 'error' ? 'error' : opts.type === 'warning' ? 'warning' : 'info';
    this.logSvc.add({
      type: logType, platform: 'system', message: `[Notification] ${opts.title}: ${opts.message}`,
    }).catch(() => {});
    return notif;
  }

  async markRead(id: string): Promise<void> {
    await this.dataSvc.markRead(id);
    this.notifications.update(n => n.map(x => x.id === id ? { ...x, read: true } : x));
  }

  async markAllRead(): Promise<void> {
    await this.dataSvc.markAllRead();
    this.notifications.update(n => n.map(x => ({ ...x, read: true })));
  }

  async dismiss(id: string): Promise<void> {
    await this.dataSvc.update(id, { dismissed: true } as any);
    this.notifications.update(n => n.filter(x => x.id !== id));
  }

  async clearAll(): Promise<void> {
    for (const n of this.notifications()) {
      if (n.id) await this.dataSvc.delete(n.id);
    }
    this.notifications.set([]);
  }
}
