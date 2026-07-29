import { Injectable, signal, computed, inject } from '@angular/core';
import { MarketplaceBaseService } from '../marketplace-base.service';
import { MarketplaceListingService } from '../marketplace-listing.service';
import { MarketplaceLogService } from '../marketplace-log.service';
import { AutomationService } from '../automation/automation.service';
import type { DocData } from '../marketplace-base.service';
import type { MarketplaceListing } from '../../models/marketplace-listing.model';
import type { MarketplaceInventory } from '../../models/marketplace-inventory.model';
import type {
  StockLog, InventoryNotification, InventoryJob, JobType, JobStatus, InventorySummary,
} from '../../models/inventory-automation.model';

@Injectable({ providedIn: 'root' })
export class StockLogService extends MarketplaceBaseService<StockLog> {
  protected readonly collectionName = 'stockLogs';

  protected toModel(id: string, data: DocData): StockLog {
    return {
      id, listingId: (data['listingId'] as string) ?? '', platform: (data['platform'] as string) ?? '',
      marketplaceProductId: data['marketplaceProductId'] as string | undefined,
      previousStock: (data['previousStock'] as number) ?? 0, newStock: (data['newStock'] as number) ?? 0,
      change: (data['change'] as number) ?? 0, type: (data['type'] as StockLog['type']) ?? 'adjustment',
      warehouseLocation: data['warehouseLocation'] as string | undefined, notes: data['notes'] as string | undefined,
      createdBy: data['createdBy'] as string | undefined,
      createdAt: (data['createdAt'] as any)?.toDate?.() ?? new Date(),
      updatedAt: (data['updatedAt'] as any)?.toDate?.() ?? new Date(),
    };
  }
}

@Injectable({ providedIn: 'root' })
export class InventoryNotificationService extends MarketplaceBaseService<InventoryNotification> {
  protected readonly collectionName = 'inventoryNotifications';

  protected toModel(id: string, data: DocData): InventoryNotification {
    return {
      id, listingId: (data['listingId'] as string) ?? '', platform: (data['platform'] as string) ?? '',
      marketplaceProductId: data['marketplaceProductId'] as string | undefined,
      productName: (data['productName'] as string) ?? '', type: (data['type'] as InventoryNotification['type']) ?? 'low_stock',
      message: (data['message'] as string) ?? '', read: (data['read'] as boolean) ?? false,
      createdBy: data['createdBy'] as string | undefined,
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

  async getUnreadCount(): Promise<number> {
    const result = await this.getAll({ filters: [{ field: 'read', op: '==', value: false }], pageSize: 100 });
    return result.items.length;
  }
}

@Injectable({ providedIn: 'root' })
export class InventoryJobService extends MarketplaceBaseService<InventoryJob> {
  protected readonly collectionName = 'inventoryJobs';

  protected toModel(id: string, data: DocData): InventoryJob {
    return {
      id, type: (data['type'] as JobType) ?? 'check_low_stock', status: (data['status'] as JobStatus) ?? 'pending',
      platform: data['platform'] as string | undefined, listingIds: data['listingIds'] as string[] | undefined,
      result: data['result'] as InventoryJob['result'] | undefined, error: data['error'] as string | undefined,
      progress: (data['progress'] as number) ?? 0, createdBy: data['createdBy'] as string | undefined,
      scheduledAt: (data['scheduledAt'] as any)?.toDate?.() as Date | undefined,
      createdAt: (data['createdAt'] as any)?.toDate?.() ?? new Date(),
      updatedAt: (data['updatedAt'] as any)?.toDate?.() ?? new Date(),
      completedAt: (data['completedAt'] as any)?.toDate?.() as Date | undefined,
    };
  }
}

@Injectable({ providedIn: 'root' })
export class InventoryAutomationService {
  private readonly listingSvc = inject(MarketplaceListingService);
  private readonly stockLogSvc = inject(StockLogService);
  private readonly notifSvc = inject(InventoryNotificationService);
  private readonly jobSvc = inject(InventoryJobService);
  private readonly logSvc = inject(MarketplaceLogService);
  private readonly autoSvc = inject(AutomationService);

  readonly allListings = signal<MarketplaceListing[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly stockLogs = signal<StockLog[]>([]);
  readonly notifications = signal<InventoryNotification[]>([]);
  readonly jobs = signal<InventoryJob[]>([]);

  readonly summary = computed<InventorySummary>(() => {
    const listings = this.allListings();
    let totalStock = 0, totalReserved = 0, totalIncoming = 0, lowStockCount = 0, outOfStockCount = 0;
    const warehouses = new Set<string>();
    let bufferCount = 0;
    for (const l of listings) {
      const inv = l.inventory;
      totalStock += inv?.availableStock ?? 0;
      totalReserved += inv?.reservedStock ?? 0;
      totalIncoming += inv?.incomingStock ?? 0;
      if (inv?.stockStatus === 'low_stock') lowStockCount++;
      if (inv?.stockStatus === 'out_of_stock') outOfStockCount++;
      if (inv?.warehouseLocation) warehouses.add(inv.warehouseLocation);
      if (inv?.availableStock !== undefined && inv?.lowStockThreshold !== undefined && inv.availableStock <= inv.lowStockThreshold * 1.5) bufferCount++;
    }
    return {
      totalListings: listings.length, totalStock, totalReserved, totalIncoming,
      lowStockCount, outOfStockCount, warehouseCount: warehouses.size, bufferStockCount: bufferCount,
    };
  });

  readonly lowStockListings = computed(() => this.allListings().filter(l => l.inventory?.stockStatus === 'low_stock' || l.inventory?.stockStatus === 'out_of_stock'));
  readonly bufferListings = computed(() => this.allListings().filter(l => {
    const inv = l.inventory;
    return inv?.availableStock !== undefined && inv?.lowStockThreshold !== undefined && inv.availableStock > 0 && inv.availableStock <= inv.lowStockThreshold * 1.5;
  }));

  async loadAll(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const result = await this.listingSvc.getAll({ pageSize: 500, sortField: 'updatedAt', sortDirection: 'desc' });
      this.allListings.set(result.items);
      await Promise.all([
        this.loadStockLogs(),
        this.loadNotifications(),
        this.loadJobs(),
      ]);
    } catch (e: any) {
      this.error.set(e?.message || 'Failed to load inventory data');
    } finally {
      this.loading.set(false);
    }
  }

  private async loadStockLogs(): Promise<void> {
    const result = await this.stockLogSvc.getAll({ pageSize: 100, sortField: 'createdAt', sortDirection: 'desc' });
    this.stockLogs.set(result.items);
  }

  private async loadNotifications(): Promise<void> {
    const result = await this.notifSvc.getAll({ pageSize: 50, sortField: 'createdAt', sortDirection: 'desc' });
    this.notifications.set(result.items);
  }

  private async loadJobs(): Promise<void> {
    const result = await this.jobSvc.getAll({ pageSize: 50, sortField: 'createdAt', sortDirection: 'desc' });
    this.jobs.set(result.items);
  }

  async updateListingStock(listing: MarketplaceListing, inventory: Partial<MarketplaceInventory>): Promise<void> {
    const previous = listing.inventory?.availableStock ?? 0;
    await this.listingSvc.updateInventory(listing.id!, inventory);
    const newStock = inventory.availableStock ?? previous;
    await this.stockLogSvc.create({
      listingId: listing.id!, platform: listing.platform,
      marketplaceProductId: listing.marketplaceProductId,
      previousStock: previous, newStock, change: newStock - previous,
      type: 'adjustment', warehouseLocation: listing.inventory?.warehouseLocation,
      createdBy: 'admin',
      createdAt: new Date(), updatedAt: new Date(),
    } as any);
  }

  async reserveStock(listing: MarketplaceListing, quantity: number): Promise<void> {
    const inv = listing.inventory;
    if (!inv || inv.availableStock < quantity) throw new Error('Insufficient stock');
    await this.listingSvc.updateInventory(listing.id!, {
      availableStock: inv.availableStock - quantity,
      reservedStock: (inv.reservedStock ?? 0) + quantity,
    });
    await this.stockLogSvc.create({
      listingId: listing.id!, platform: listing.platform,
      marketplaceProductId: listing.marketplaceProductId,
      previousStock: inv.availableStock, newStock: inv.availableStock - quantity,
      change: -quantity, type: 'reservation',
      createdAt: new Date(), updatedAt: new Date(),
    } as any);
  }

  async releaseStock(listing: MarketplaceListing, quantity: number): Promise<void> {
    const inv = listing.inventory;
    if (!inv || (inv.reservedStock ?? 0) < quantity) throw new Error('Cannot release more than reserved');
    await this.listingSvc.updateInventory(listing.id!, {
      availableStock: inv.availableStock + quantity,
      reservedStock: (inv.reservedStock ?? 0) - quantity,
    });
    await this.stockLogSvc.create({
      listingId: listing.id!, platform: listing.platform,
      marketplaceProductId: listing.marketplaceProductId,
      previousStock: inv.availableStock, newStock: inv.availableStock + quantity,
      change: quantity, type: 'release',
      createdAt: new Date(), updatedAt: new Date(),
    } as any);
  }

  async syncStockToMarketplace(listing: MarketplaceListing): Promise<void> {
    const stock = listing.inventory?.availableStock ?? 0;
    await this.autoSvc.updateStock(listing.platform, listing.marketplaceListingId, stock);
    await this.logSvc.add({
      type: 'sync', platform: listing.platform,
      marketplaceListingId: listing.id, marketplaceProductId: listing.marketplaceProductId,
      message: `Stock sync queued for ${listing.marketplaceSku}: ${stock} units`,
      details: `Platform: ${listing.platform}, Listing: ${listing.marketplaceListingId}`,
    });
  }

  async syncAllListings(): Promise<InventoryJob> {
    const job = await this.jobSvc.create({
      type: 'sync_all', status: 'running', progress: 0, createdAt: new Date(), updatedAt: new Date(),
    } as any);
    let updated = 0, failed = 0;
    for (const l of this.allListings()) {
      try {
        await this.syncStockToMarketplace(l);
        updated++;
      } catch { failed++; }
      await this.jobSvc.update(job.id!, { progress: Math.round((updated + failed) / this.allListings().length * 100) } as any);
    }
    await this.jobSvc.update(job.id!, {
      status: 'completed', progress: 100, completedAt: new Date(),
      result: { updated, failed, details: `Synced ${updated} listings, ${failed} failed` },
    } as any);
    return { ...job, status: 'completed', result: { updated, failed, details: '' } };
  }

  async checkLowStock(): Promise<InventoryJob> {
    const job = await this.jobSvc.create({
      type: 'check_low_stock', status: 'running', progress: 0, createdAt: new Date(), updatedAt: new Date(),
    } as any);
    let notified = 0;
    for (const l of this.allListings()) {
      const inv = l.inventory;
      if (!inv) continue;
      if (inv.stockStatus === 'low_stock' || inv.stockStatus === 'out_of_stock') {
        await this.notifSvc.create({
          listingId: l.id!, platform: l.platform, marketplaceProductId: l.marketplaceProductId,
          productName: l.marketplaceTitle || '', type: inv.stockStatus === 'out_of_stock' ? 'out_of_stock' : 'low_stock',
          message: `${l.marketplaceTitle || 'Listing'} on ${l.platform}: ${inv.availableStock} remaining (threshold: ${inv.lowStockThreshold})`,
          read: false, createdAt: new Date(), updatedAt: new Date(),
        } as any);
        notified++;
      }
    }
    await this.jobSvc.update(job.id!, { status: 'completed', progress: 100, completedAt: new Date(), result: { updated: notified, failed: 0, details: `${notified} notifications created` } } as any);
    return { ...job, status: 'completed', result: { updated: notified, failed: 0, details: '' } };
  }

  async markNotifRead(id: string): Promise<void> {
    await this.notifSvc.markRead(id);
    this.notifications.update(n => n.map(x => x.id === id ? { ...x, read: true } : x));
  }

  async markAllNotifsRead(): Promise<void> {
    await this.notifSvc.markAllRead();
    this.notifications.update(n => n.map(x => ({ ...x, read: true })));
  }

  createJobData(job: InventoryJob): { type: string; created: string; status: string; progress: number; result?: string } {
    return {
      type: job.type, created: job.createdAt?.toISOString?.() ?? String(job.createdAt),
      status: job.status, progress: job.progress,
      result: job.result?.details || job.error,
    };
  }
}
