import { Injectable, inject, signal, OnDestroy } from '@angular/core';
import { MarketplaceFirebaseService } from '../marketplace/services/marketplace-firebase.service';
import {
  collection, query, orderBy, where, limit as firestoreLimit, onSnapshot,
  Timestamp, Unsubscribe,
} from 'firebase/firestore';
import type { ChartDataset } from '../marketplace/models/chart.model';

export interface SalesStats {
  totalRevenue: number; totalProducts: number; activeListings: number;
  pendingListings: number; outOfStock: number; totalListings: number;
}
export interface ProductStats { totalProducts: number; withListings: number; withoutListings: number; totalListings: number; }
export interface CategoryStats { totalCategories: number; topCategory: string; topCategoryCount: number; }
export interface AIStats { aiGenerated: number; aiOptimized: number; manual: number; notApplicable: number; }
export interface TrafficStats { totalLogs: number; uniqueTypes: number; totalSyncs: number; }
export interface ConversionStats { totalListings: number; published: number; draft: number; pending: number; failed: number; conversionRate: number; }

const DAY_MS = 24 * 60 * 60 * 1000;

@Injectable({ providedIn: 'root' })
export class AnalyticsService implements OnDestroy {
  private readonly fb = inject(MarketplaceFirebaseService);
  private unsubs: Unsubscribe[] = [];

  readonly loading = signal(true);

  readonly salesStats = signal<SalesStats>({ totalRevenue: 0, totalProducts: 0, activeListings: 0, pendingListings: 0, outOfStock: 0, totalListings: 0 });
  readonly revenueByPlatform = signal<ChartDataset>({ labels: [], data: [] });
  readonly salesTrend = signal<ChartDataset>({ labels: [], data: [] });
  readonly salesStatusDist = signal<ChartDataset>({ labels: [], data: [] });
  readonly topProductsByValue = signal<ChartDataset>({ labels: [], data: [] });

  readonly productStats = signal<ProductStats>({ totalProducts: 0, withListings: 0, withoutListings: 0, totalListings: 0 });
  readonly productsByPlatform = signal<ChartDataset>({ labels: [], data: [] });

  readonly categoryStats = signal<CategoryStats>({ totalCategories: 0, topCategory: '', topCategoryCount: 0 });
  readonly categoryDistribution = signal<ChartDataset>({ labels: [], data: [] });

  readonly aiStats = signal<AIStats>({ aiGenerated: 0, aiOptimized: 0, manual: 0, notApplicable: 0 });
  readonly aiDistribution = signal<ChartDataset>({ labels: [], data: [] });
  readonly aiByPlatform = signal<ChartDataset>({ labels: [], data: [] });

  readonly trafficStats = signal<TrafficStats>({ totalLogs: 0, uniqueTypes: 0, totalSyncs: 0 });
  readonly trafficByType = signal<ChartDataset>({ labels: [], data: [] });
  readonly trafficTimeline = signal<ChartDataset>({ labels: [], data: [] });

  readonly conversionStats = signal<ConversionStats>({ totalListings: 0, published: 0, draft: 0, pending: 0, failed: 0, conversionRate: 0 });
  readonly conversionFunnel = signal<ChartDataset>({ labels: [], data: [] });

  readonly perfPlatformDist = signal<ChartDataset>({ labels: [], data: [] });
  readonly perfStatusOverview = signal<ChartDataset>({ labels: [], data: [] });
  readonly perfCategoryDist = signal<ChartDataset>({ labels: [], data: [] });

  readonly marketplaceStats = signal({ totalListings: 0, published: 0, draft: 0, pending: 0, failed: 0, outOfStock: 0 });
  readonly platformDistribution = signal<ChartDataset>({ labels: [], data: [] });
  readonly publishTrend = signal<ChartDataset>({ labels: [], data: [] });
  readonly syncTrend = signal<ChartDataset>({ labels: [], data: [] });
  readonly failureReasons = signal<ChartDataset>({ labels: [], data: [] });
  readonly inventoryValue = signal<ChartDataset>({ labels: [], data: [] });
  readonly topProducts = signal<ChartDataset>({ labels: [], data: [] });
  readonly listingGrowth = signal<ChartDataset>({ labels: [], data: [] });

  constructor() {
    void this.init();
  }

  private async init(): Promise<void> {
    try {
      const db = await this.fb.getFirestore();
      const listingsCol = collection(db, 'marketplaceListings');
      const syncsCol = collection(db, 'marketplaceSyncs');
      const logsCol = collection(db, 'marketplaceLogs');
      const productsCol = collection(db, 'marketplaceProducts');
      const last7Days = Timestamp.fromDate(new Date(Date.now() - 7 * DAY_MS));
      const last30Days = Timestamp.fromDate(new Date(Date.now() - 30 * DAY_MS));

      this.unsubs.push(
        onSnapshot(listingsCol, (snap) => {
          let published = 0, draft = 0, pending = 0, outOfStock = 0, failed = 0;
          const platformCount: Record<string, number> = {};
          const publishDayCount: Record<string, number> = {};
          const platformValue: Record<string, number> = {};
          const productAgg: Record<string, { title: string; value: number }> = {};
          const productSet = new Set<string>();
          let totalRevenue = 0;

          const aiGenerated = 0, aiOptimized = 0, manual = 0, notApplicable = 0;
          const aiCount: Record<string, number> = {};
          const aiPlatformCount: Record<string, Record<string, number>> = {};
          const statusCount: Record<string, number> = {};
          const platformListings: Record<string, number> = {};

          snap.forEach(doc => {
            const d = doc.data();
            const status = (d['listingStatus'] as string) ?? '';
            const inventory = (d['inventory'] as Record<string, unknown>) ?? {};
            const pricing = (d['pricing'] as Record<string, unknown>) ?? {};
            const platform = (d['platform'] as string) ?? 'other';
            const stockStatus = (inventory['stockStatus'] as string) ?? '';
            const ai = (d['aiStatus'] as string) || 'not_applicable';

            if (status === 'active') published++;
            else if (status === 'draft') draft++;
            else if (status === 'pending') pending++;
            if (status === 'rejected' || status === 'blocked') failed++;
            if (stockStatus === 'out_of_stock') outOfStock++;

            platformCount[platform] = (platformCount[platform] ?? 0) + 1;
            statusCount[status] = (statusCount[status] ?? 0) + 1;
            aiCount[ai] = (aiCount[ai] ?? 0) + 1;
            platformListings[platform] = (platformListings[platform] ?? 0) + 1;

            if (!aiPlatformCount[platform]) aiPlatformCount[platform] = {};
            aiPlatformCount[platform][ai] = (aiPlatformCount[platform][ai] ?? 0) + 1;

            const pubAt = (d['publishedAt'] as Timestamp)?.toDate?.();
            if (pubAt && (Date.now() - pubAt.getTime()) < 7 * DAY_MS) {
              const day = pubAt.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
              publishDayCount[day] = (publishDayCount[day] ?? 0) + 1;
            }

            const price = (pricing['sellingPrice'] as number) ?? 0;
            const stock = (inventory['availableStock'] as number) ?? 0;
            const val = price * stock;
            totalRevenue += val;
            platformValue[platform] = (platformValue[platform] ?? 0) + val;

            const pid = d['marketplaceProductId'] as string;
            if (pid) {
              productSet.add(pid);
              if (!productAgg[pid]) productAgg[pid] = { title: (d['marketplaceTitle'] as string) || pid.slice(0, 8), value: 0 };
              productAgg[pid].value += val;
            }
          });

          const sorted = Object.entries(productAgg).sort(([, a], [, b]) => b.value - a.value).slice(0, 10);

          const l = snap.size;
          this.salesStats.set({ totalRevenue, totalProducts: productSet.size, activeListings: published, pendingListings: pending, outOfStock, totalListings: l });
          this.revenueByPlatform.set({ labels: Object.keys(platformValue), data: Object.values(platformValue) });
          this.salesTrend.set({ labels: Object.keys(publishDayCount), data: Object.values(publishDayCount) });
          this.salesStatusDist.set({ labels: Object.keys(statusCount), data: Object.values(statusCount) });
          this.topProductsByValue.set({ labels: sorted.map(([, v]) => v.title), data: sorted.map(([, v]) => v.value) });
          this.marketplaceStats.set({ totalListings: l, published, draft, pending, failed, outOfStock });
          this.platformDistribution.set({ labels: Object.keys(platformCount), data: Object.values(platformCount) });
          this.publishTrend.set({ labels: Object.keys(publishDayCount), data: Object.values(publishDayCount) });
          this.inventoryValue.set({ labels: Object.keys(platformValue), data: Object.values(platformValue) });
          this.topProducts.set({ labels: sorted.map(([, v]) => v.title), data: sorted.map(([, v]) => v.value) });
          this.conversionStats.set({
            totalListings: l, published, draft, pending, failed,
            conversionRate: l > 0 ? Math.round((published / l) * 100) : 0,
          });
          this.conversionFunnel.set({
            labels: ['Total', 'Published', 'Pending', 'Draft', 'Failed'],
            data: [l, published, pending, draft, failed],
          });
          this.perfPlatformDist.set({ labels: Object.keys(platformCount), data: Object.values(platformCount) });
          this.perfStatusOverview.set({ labels: Object.keys(statusCount), data: Object.values(statusCount) });

          this.aiStats.set({
            aiGenerated: aiCount['ai_generated'] ?? 0,
            aiOptimized: aiCount['ai_optimized'] ?? 0,
            manual: aiCount['manual'] ?? 0,
            notApplicable: aiCount['not_applicable'] ?? 0,
          });
          this.aiDistribution.set({ labels: Object.keys(aiCount), data: Object.values(aiCount) });

          const aiPlatformLabels: string[] = [];
          const aiPlatformData: number[] = [];
          for (const [p, vals] of Object.entries(aiPlatformCount)) {
            const totalAi = Object.values(vals).reduce((a, b) => a + b, 0);
            aiPlatformLabels.push(p);
            aiPlatformData.push(totalAi);
          }
          this.aiByPlatform.set({ labels: aiPlatformLabels, data: aiPlatformData });

          this.productStats.update(s => ({ ...s, totalListings: l }));
          this.productsByPlatform.set({ labels: Object.keys(platformListings), data: Object.values(platformListings) });
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

      this.unsubs.push(
        onSnapshot(
          query(listingsCol, where('createdAt', '>=', last30Days), orderBy('createdAt', 'asc')),
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
            this.listingGrowth.set({ labels: Object.keys(dayCount), data: Object.values(dayCount) });
          },
        ),
      );

      this.unsubs.push(
        onSnapshot(
          query(logsCol, orderBy('createdAt', 'desc'), firestoreLimit(500)),
          (snap) => {
            const typeCount: Record<string, number> = {};
            const dayCount: Record<string, number> = {};
            snap.forEach(doc => {
              const d = doc.data();
              const type = (d['type'] as string) ?? 'info';
              typeCount[type] = (typeCount[type] ?? 0) + 1;
              const ts = (d['createdAt'] as Timestamp)?.toDate?.();
              if (ts) {
                const day = ts.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
                dayCount[day] = (dayCount[day] ?? 0) + 1;
              }
            });
            this.trafficStats.set({ totalLogs: snap.size, uniqueTypes: Object.keys(typeCount).length, totalSyncs: 0 });
            this.trafficByType.set({ labels: Object.keys(typeCount), data: Object.values(typeCount) });
            this.trafficTimeline.set({ labels: Object.keys(dayCount), data: Object.values(dayCount) });
          },
        ),
      );

      this.unsubs.push(
        onSnapshot(productsCol, (snap) => {
          const catCount: Record<string, number> = {};
          snap.forEach(doc => {
            const d = doc.data();
            const cat = (d['category'] as string) || 'Uncategorized';
            catCount[cat] = (catCount[cat] ?? 0) + 1;
          });
          const entries = Object.entries(catCount).sort(([, a], [, b]) => b - a);
          this.categoryStats.set({
            totalCategories: entries.length,
            topCategory: entries[0]?.[0] ?? '',
            topCategoryCount: entries[0]?.[1] ?? 0,
          });
          this.categoryDistribution.set({ labels: entries.map(([k]) => k), data: entries.map(([, v]) => v) });
          this.perfCategoryDist.set({ labels: entries.map(([k]) => k), data: entries.map(([, v]) => v) });
          this.productStats.update(s => ({ ...s, totalProducts: snap.size }));
        }),
      );
    } catch (_e) {
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
