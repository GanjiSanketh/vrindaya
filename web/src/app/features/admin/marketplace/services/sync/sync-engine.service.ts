import { Injectable, signal, inject } from '@angular/core';
import { MarketplaceProductService } from '../marketplace-product.service';
import { MarketplaceListingService } from '../marketplace-listing.service';
import { SyncComparatorService } from './sync-comparator.service';
import { SyncAuditService } from './sync-audit.service';
import { AutomationService } from '../automation/automation.service';
import type { MarketplaceProduct } from '../../models/marketplace-product.model';
import type { MarketplaceListing } from '../../models/marketplace-listing.model';
import type {
  ListingComparison, FieldDiff, ConflictStrategy, SyncScope, SyncSnapshot,
} from './models/sync-comparison.model';

export interface SyncProgress {
  total: number;
  completed: number;
  failed: number;
  skipped: number;
  current: string;
}

@Injectable({ providedIn: 'root' })
export class SyncEngineService {
  private readonly productSvc = inject(MarketplaceProductService);
  private readonly listingSvc = inject(MarketplaceListingService);
  private readonly comparator = inject(SyncComparatorService);
  private readonly audit = inject(SyncAuditService);
  private readonly automation = inject(AutomationService);

  readonly progress = signal<SyncProgress | null>(null);
  readonly lastResult = signal<string | null>(null);

  async syncOne(
    productId: string,
    options?: { conflictStrategy?: ConflictStrategy; targetPrice?: number; targetStock?: number },
  ): Promise<ListingComparison[]> {
    return this.syncMany([productId], { ...options, scope: 'one' });
  }

  async syncMany(
    productIds: string[],
    options?: { conflictStrategy?: ConflictStrategy; targetPrice?: number; targetStock?: number; scope?: SyncScope },
  ): Promise<ListingComparison[]> {
    const strategy = options?.conflictStrategy ?? 'website-wins';
    const scope = options?.scope ?? 'many';
    const allComparisons: ListingComparison[] = [];
    const snapshots: Record<string, SyncSnapshot> = {};

    this.progress.set({ total: productIds.length, completed: 0, failed: 0, skipped: 0, current: 'Preparing...' });

    for (const pid of productIds) {
      this.progress.update(p => ({ ...p!, current: `Processing product ${pid.slice(0, 8)}...` }));
      try {
        const product = await this.productSvc.getById(pid);
        if (!product) { this.progress.update(p => ({ ...p!, skipped: p!.skipped + 1 })); continue; }

        const listings = await this.listingSvc.getByProductId(pid);
        if (!listings.length) { this.progress.update(p => ({ ...p!, skipped: p!.skipped + 1 })); continue; }

        for (const listing of listings) {
          if (options?.targetPrice !== undefined) listing.pricing.sellingPrice = options.targetPrice;
          if (options?.targetStock !== undefined) listing.inventory.totalStock = options.targetStock;

          const comparison = this.comparator.compare(product, listing);
          if (!comparison.hasChanges) { this.progress.update(p => ({ ...p!, skipped: p!.skipped + 1 })); continue; }

          const resolution = this.resolve(strategy, comparison.diffs);
          const appliedDiffs = resolution.applied;

          if (appliedDiffs.length) {
            snapshots[listing.id!] = {
              pricing: { ...listing.pricing },
              inventory: { ...listing.inventory },
              marketplaceTitle: listing.marketplaceTitle,
              marketplaceDescription: listing.marketplaceDescription,
            };
            await this.applyChanges(listing, appliedDiffs);
          }

          for (const d of comparison.diffs) {
            const resolved = resolution.applied.find(a => a.field === d.field);
            await this.audit.log({
              operationId: crypto.randomUUID(),
              scope, platform: listing.platform,
              productId: pid, listingId: listing.id!,
              field: d.field, action: resolved ? 'synced' : 'conflict',
              sourceValue: d.sourceValue, targetValue: d.targetValue,
              conflictStrategy: strategy, status: 'completed',
            });
          }
          allComparisons.push(comparison);
          this.progress.update(p => ({ ...p!, completed: p!.completed + 1 }));
        }
      } catch (err) {
        this.progress.update(p => ({ ...p!, failed: p!.failed + 1 }));
      }
    }

    this.lastResult.set(`Synced ${allComparisons.length} listings across ${productIds.length} products.`);
    this.progress.update(p => ({ ...p!, current: 'Done' }));
    return allComparisons;
  }

  async syncAll(
    options?: { conflictStrategy?: ConflictStrategy; targetPrice?: number; targetStock?: number },
  ): Promise<ListingComparison[]> {
    const result = await this.productSvc.getAll({ pageSize: 500 });
    const ids = result.items.map(p => p.id!).filter(Boolean);
    return this.syncMany(ids, { ...options, scope: 'all' });
  }

  async rollback(comparisons: ListingComparison[]): Promise<void> {
    for (const c of comparisons) {
      try {
        const listing = await this.listingSvc.getById(c.listingId);
        if (!listing) continue;
        for (const d of c.diffs) {
          switch (d.field) {
            case 'title': listing.marketplaceTitle = d.targetValue as string; break;
            case 'description': listing.marketplaceDescription = d.targetValue as string; break;
            case 'price': listing.pricing.sellingPrice = d.targetValue as number; break;
            case 'stock': listing.inventory.totalStock = d.targetValue as number; break;
          }
        }
        await this.listingSvc.update(c.listingId, listing as any);
        await this.audit.log({
          operationId: crypto.randomUUID(), scope: 'one', platform: c.platform,
          productId: c.productId, listingId: c.listingId,
          field: 'rollback', action: 'rolled_back',
          sourceValue: null, targetValue: null,
          conflictStrategy: 'website-wins', status: 'completed',
        });
      } catch {
        // skip failed rollbacks
      }
    }
  }

  private resolve(strategy: ConflictStrategy, diffs: FieldDiff[]): { applied: FieldDiff[]; conflicts: FieldDiff[] } {
    const applied: FieldDiff[] = [];
    const conflicts: FieldDiff[] = [];
    for (const d of diffs) {
      if (strategy === 'website-wins') { applied.push(d); continue; }
      if (strategy === 'marketplace-wins') { /* skip — keep listing value */ continue; }
      if (strategy === 'skip') { conflicts.push(d); continue; }
      if (strategy === 'manual') { conflicts.push(d); continue; }
      applied.push(d);
    }
    return { applied, conflicts };
  }

  private async applyChanges(listing: MarketplaceListing, diffs: FieldDiff[]): Promise<void> {
    const update: Record<string, unknown> = {};
    for (const d of diffs) {
      switch (d.field) {
        case 'title': update['marketplaceTitle'] = d.sourceValue; break;
        case 'description': update['marketplaceDescription'] = d.sourceValue; break;
        case 'price': update['pricing'] = { ...listing.pricing, sellingPrice: d.sourceValue as number }; break;
        case 'stock': update['inventory'] = { ...listing.inventory, totalStock: d.sourceValue as number }; break;
        case 'seo': update['marketplaceTitle'] = d.sourceValue; break;
        case 'attributes': break;
        case 'images':
          await this.automation.updateImages(listing.platform, listing.marketplaceListingId, d.sourceValue as string[]);
          break;
      }
    }
    if (Object.keys(update).length) {
      await this.listingSvc.update(listing.id!, update as any);
    }
  }
}
