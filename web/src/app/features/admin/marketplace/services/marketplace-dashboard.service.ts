import { Injectable, inject, signal, OnDestroy } from '@angular/core';
import { MarketplaceFirebaseService } from './marketplace-firebase.service';
import {
  collection, query, orderBy, where, limit as firestoreLimit, onSnapshot,
  Timestamp, Unsubscribe,
} from 'firebase/firestore';
import type { ChartDataset } from '../models/chart.model';

export interface DashboardStats {
  totalListings: number;
  published: number;
  draft: number;
  pending: number;
  failed: number;
  outOfStock: number;
  needsReview: number;
}

export interface ActivityItem {
  id: string;
  type: string;
  platform: string;
  message: string;
  details?: string;
  time: Date;
}

const DAY_MS = 24 * 60 * 60 * 1000;

@Injectable({ providedIn: 'root' })
export class MarketplaceDashboardService implements OnDestroy {
  private readonly fb = inject(MarketplaceFirebaseService);

  readonly stats = signal<DashboardStats>({
    totalListings: 0, published: 0, draft: 0, pending: 0, failed: 0,
    outOfStock: 0, needsReview: 0,
  });

  readonly platformDistribution = signal<ChartDataset>({ labels: [], data: [] });
  readonly categoryDistribution = signal<ChartDataset>({ labels: [], data: [] });
  readonly aiUsage = signal<ChartDataset>({ labels: [], data: [] });
  readonly listingGrowth = signal<ChartDataset>({ labels: [], data: [] });
  readonly publishTrend = signal<ChartDataset>({ labels: [], data: [] });
  readonly syncTrend = signal<ChartDataset>({ labels: [], data: [] });
  readonly recentActivity = signal<ActivityItem[]>([]);
  readonly loading = signal(true);

  private unsubs: Unsubscribe[] = [];

  constructor() {
    void this.init();
  }

  private async init(): Promise<void> {
    try {
      const db = await this.fb.getFirestore();

      const listingsCol = collection(db, 'marketplaceListings');
      const syncsCol = collection(db, 'marketplaceSyncs');
      const logsCol = collection(db, 'marketplaceLogs');

      const last7Days = Timestamp.fromDate(new Date(Date.now() - 7 * DAY_MS));

      this.unsubs.push(
        onSnapshot(listingsCol, (snap) => {
          let published = 0, draft = 0, pending = 0, outOfStock = 0, needsReview = 0;
          const platformCount: Record<string, number> = {};
          const publishDayCount: Record<string, number> = {};

          snap.forEach(doc => {
            const d = doc.data();
            const status = (d['listingStatus'] as string) ?? '';
            const publishStatus = (d['publishStatus'] as string) ?? '';
            const inventory = (d['inventory'] as Record<string, unknown>) ?? {};
            const stockStatus = (inventory['stockStatus'] as string) ?? '';
            const platform = (d['platform'] as string) ?? 'other';

            if (status === 'active') published++;
            else if (status === 'draft') draft++;
            else if (status === 'pending') pending++;
            if (status === 'rejected' || publishStatus === 'suspended') needsReview++;
            if (stockStatus === 'out_of_stock') outOfStock++;

            platformCount[platform] = (platformCount[platform] ?? 0) + 1;

            const pubAt = (d['publishedAt'] as Timestamp)?.toDate?.();
            if (pubAt && (Date.now() - pubAt.getTime()) < 7 * DAY_MS) {
              const day = pubAt.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
              publishDayCount[day] = (publishDayCount[day] ?? 0) + 1;
            }
          });

          this.stats.set({
            totalListings: snap.size,
            published, draft, pending,
            failed: this.stats().failed,
            outOfStock, needsReview,
          });

          this.platformDistribution.set({
            labels: Object.keys(platformCount),
            data: Object.values(platformCount),
          });

          this.publishTrend.set({
            labels: Object.keys(publishDayCount),
            data: Object.values(publishDayCount),
          });
        }),
      );

      this.unsubs.push(
        onSnapshot(
          query(syncsCol, where('status', '==', 'failed'), firestoreLimit(100)),
          (snap) => { this.stats.update(s => ({ ...s, failed: snap.size })); },
        ),
      );

      this.unsubs.push(
        onSnapshot(
          query(syncsCol, where('createdAt', '>=', last7Days), orderBy('createdAt', 'asc')),
          (snap) => {
            const dayCount: Record<string, number> = {};
            snap.forEach(doc => {
              const d = doc.data();
              const ts = (d['createdAt'] as Timestamp)?.toDate?.();
              if (ts) {
                const day = ts.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
                dayCount[day] = (dayCount[day] ?? 0) + 1;
              }
            });
            this.syncTrend.set({ labels: Object.keys(dayCount), data: Object.values(dayCount) });
          },
        ),
      );

      this.unsubs.push(
        onSnapshot(
          query(logsCol, orderBy('createdAt', 'desc'), firestoreLimit(15)),
          (snap) => {
            const items: ActivityItem[] = [];
            snap.forEach(doc => {
              const d = doc.data();
              items.push({
                id: doc.id,
                type: (d['type'] as string) ?? 'info',
                platform: (d['platform'] as string) ?? '',
                message: (d['message'] as string) ?? '',
                details: d['details'] as string | undefined,
                time: (d['createdAt'] as Timestamp)?.toDate?.() ?? new Date(),
              });
            });
            this.recentActivity.set(items);
          },
        ),
      );

      const productsCol = collection(db, 'marketplaceProducts');

      this.unsubs.push(
        onSnapshot(productsCol, (snap) => {
          const catCount: Record<string, number> = {};
          snap.forEach(doc => {
            const d = doc.data();
            const cat = (d['category'] as string) || 'Uncategorized';
            catCount[cat] = (catCount[cat] ?? 0) + 1;
          });
          this.categoryDistribution.set({
            labels: Object.keys(catCount),
            data: Object.values(catCount),
          });
        }),
      );

      this.unsubs.push(
        onSnapshot(listingsCol, (snap) => {
          const aiCount: Record<string, number> = {};
          snap.forEach(doc => {
            const d = doc.data();
            const ai = (d['aiStatus'] as string) || 'not_applicable';
            aiCount[ai] = (aiCount[ai] ?? 0) + 1;
          });
          this.aiUsage.set({
            labels: Object.keys(aiCount),
            data: Object.values(aiCount),
          });
        }),
      );

      this.unsubs.push(
        onSnapshot(
          query(listingsCol, where('createdAt', '>=', Timestamp.fromDate(new Date(Date.now() - 30 * DAY_MS))), orderBy('createdAt', 'asc')),
          (snap) => {
            const dayCount: Record<string, number> = {};
            snap.forEach(doc => {
              const d = doc.data();
              const ts = (d['createdAt'] as Timestamp)?.toDate?.();
              if (ts) {
                const day = ts.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
                dayCount[day] = (dayCount[day] ?? 0) + 1;
              }
            });
            this.listingGrowth.set({
              labels: Object.keys(dayCount),
              data: Object.values(dayCount),
            });
          },
        ),
      );

    } catch (e) {
    } finally {
      this.loading.set(false);
    }
  }

  ngOnDestroy(): void {
    for (const unsub of this.unsubs) {
      try { unsub(); } catch { /* ignore */ }
    }
    this.unsubs = [];
  }
}
