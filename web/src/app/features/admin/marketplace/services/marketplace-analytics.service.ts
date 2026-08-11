import { Injectable, inject, signal, OnDestroy } from '@angular/core';
import { MarketplaceFirebaseService } from './marketplace-firebase.service';
import {
  collection, query, orderBy, where, limit as firestoreLimit, onSnapshot,
  Timestamp, Unsubscribe,
} from 'firebase/firestore';
import type { ChartDataset } from '../models/chart.model';

export interface AnalyticsStats {
  totalListings: number;
  published: number;
  draft: number;
  pending: number;
  failed: number;
  outOfStock: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

@Injectable({ providedIn: 'root' })
export class MarketplaceAnalyticsService implements OnDestroy {
  private readonly fb = inject(MarketplaceFirebaseService);

  readonly stats = signal<AnalyticsStats>({
    totalListings: 0, published: 0, draft: 0, pending: 0, failed: 0, outOfStock: 0,
  });

  readonly platformDistribution = signal<ChartDataset>({ labels: [], data: [] });
  readonly publishTrend = signal<ChartDataset>({ labels: [], data: [] });
  readonly syncTrend = signal<ChartDataset>({ labels: [], data: [] });
  readonly failureReasons = signal<ChartDataset>({ labels: [], data: [] });
  readonly inventoryValue = signal<ChartDataset>({ labels: [], data: [] });
  readonly topProducts = signal<ChartDataset>({ labels: [], data: [] });
  readonly loading = signal(true);
  readonly lastUpdated = signal<Date>(new Date());

  private unsubs: Unsubscribe[] = [];

  constructor() {
    void this.init();
  }

  private async init(): Promise<void> {
    try {
      const db = await this.fb.getFirestore();
      const listingsCol = collection(db, 'marketplaceListings');
      const syncsCol = collection(db, 'marketplaceSyncs');
      const last7Days = Timestamp.fromDate(new Date(Date.now() - 7 * DAY_MS));

      this.unsubs.push(
        onSnapshot(listingsCol, (snap) => {
          let published = 0, draft = 0, pending = 0, outOfStock = 0, failed = 0;
          const platformCount: Record<string, number> = {};
          const publishDayCount: Record<string, number> = {};
          const platformValue: Record<string, number> = {};
          const productAgg: Record<string, { title: string; value: number }> = {};

          snap.forEach(doc => {
            const d = doc.data();
            const status = (d['listingStatus'] as string) ?? '';
            const inventory = (d['inventory'] as Record<string, unknown>) ?? {};
            const pricing = (d['pricing'] as Record<string, unknown>) ?? {};
            const platform = (d['platform'] as string) ?? 'other';
            const stockStatus = (inventory['stockStatus'] as string) ?? '';

            if (status === 'active') published++;
            else if (status === 'draft') draft++;
            else if (status === 'pending') pending++;
            if (status === 'rejected' || status === 'blocked') failed++;
            if (stockStatus === 'out_of_stock') outOfStock++;

            platformCount[platform] = (platformCount[platform] ?? 0) + 1;

            const pubAt = (d['publishedAt'] as Timestamp)?.toDate?.();
            if (pubAt && (Date.now() - pubAt.getTime()) < 7 * DAY_MS) {
              const day = pubAt.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
              publishDayCount[day] = (publishDayCount[day] ?? 0) + 1;
            }

            const price = (pricing['sellingPrice'] as number) ?? 0;
            const stock = (inventory['availableStock'] as number) ?? 0;
            const val = price * stock;
            platformValue[platform] = (platformValue[platform] ?? 0) + val;

            const pid = d['marketplaceProductId'] as string;
            if (pid) {
              if (!productAgg[pid]) productAgg[pid] = { title: (d['marketplaceTitle'] as string) || pid.slice(0, 8), value: 0 };
              productAgg[pid].value += val;
            }
          });

          const sorted = Object.entries(productAgg).sort(([, a], [, b]) => b.value - a.value).slice(0, 10);

          this.stats.set({ totalListings: snap.size, published, draft, pending, failed, outOfStock });
          this.platformDistribution.set({ labels: Object.keys(platformCount), data: Object.values(platformCount) });
          this.publishTrend.set({ labels: Object.keys(publishDayCount), data: Object.values(publishDayCount) });
          this.inventoryValue.set({ labels: Object.keys(platformValue), data: Object.values(platformValue) });
          this.topProducts.set({ labels: sorted.map(([, v]) => v.title), data: sorted.map(([, v]) => v.value) });
          this.lastUpdated.set(new Date());
        }),
      );

      this.unsubs.push(
        onSnapshot(
          query(syncsCol, where('status', '==', 'failed'), firestoreLimit(500)),
          (snap) => {
            const reasons: Record<string, number> = {};
            snap.forEach(doc => {
              const err = (doc.data()['errorMessage'] as string) ?? 'Unknown error';
              const key = err.length > 60 ? err.slice(0, 60) + '...' : err;
              reasons[key] = (reasons[key] ?? 0) + 1;
            });
            this.failureReasons.set({ labels: Object.keys(reasons), data: Object.values(reasons) });
          },
        ),
      );

      this.unsubs.push(
        onSnapshot(
          query(syncsCol, where('createdAt', '>=', last7Days), orderBy('createdAt', 'asc')),
          (snap) => {
            const dayCount: Record<string, number> = {};
            snap.forEach(doc => {
              const ts = (doc.data()['createdAt'] as Timestamp)?.toDate?.();
              if (ts) {
                const day = ts.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
                dayCount[day] = (dayCount[day] ?? 0) + 1;
              }
            });
            this.syncTrend.set({ labels: Object.keys(dayCount), data: Object.values(dayCount) });
          },
        ),
      );

    } catch {
    } finally {
      this.loading.set(false);
    }
  }

  refresh(): void {
    for (const u of this.unsubs) { try { u(); } catch { /* ignore */ } }
    this.unsubs = [];
    this.loading.set(true);
    void this.init();
  }

  ngOnDestroy(): void {
    for (const u of this.unsubs) { try { u(); } catch { /* ignore */ } }
    this.unsubs = [];
  }
}
