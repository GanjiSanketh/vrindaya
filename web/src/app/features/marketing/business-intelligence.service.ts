import { Injectable, signal, computed } from '@angular/core';
import {
  Insight,
  KPIMetric,
  CategoryPerformance,
  ProductPerformance,
  ChartDataPoint,
  INSIGHT_CATEGORIES,
  generateMockInsights,
  generateKPIs,
  generateCategoryPerformance,
  generateProductPerformance,
  generateRevenueTrend,
  generateChannelPerformance,
} from '../models/business-intelligence.model';

@Injectable({ providedIn: 'root' })
export class BusinessIntelligenceService {
  private _insights = signal<Insight[]>(generateMockInsights());
  private _kpis = signal<KPIMetric[]>(generateKPIs());
  private _categoryPerformance = signal<CategoryPerformance[]>(generateCategoryPerformance());
  private _productPerformance = signal<ProductPerformance[]>(generateProductPerformance());
  private _revenueTrend = signal<ChartDataPoint[]>(generateRevenueTrend());
  private _channelPerformance = signal<ChartDataPoint[]>(generateChannelPerformance());

  readonly insights = computed(() => this._insights());
  readonly kpis = computed(() => this._kpis());
  readonly categoryPerformance = computed(() => this._categoryPerformance());
  readonly productPerformance = computed(() => this._productPerformance());
  readonly revenueTrend = computed(() => this._revenueTrend());
  readonly channelPerformance = computed(() => this._channelPerformance());
  readonly categories = INSIGHT_CATEGORIES;

  readonly criticalInsights = computed(() => this._insights().filter(i => i.severity === 'critical'));
  readonly warningInsights = computed(() => this._insights().filter(i => i.severity === 'warning'));
  readonly successInsights = computed(() => this._insights().filter(i => i.severity === 'success'));
  readonly infoInsights = computed(() => this._insights().filter(i => i.severity === 'info'));

  readonly promoteProducts = computed(() => this._productPerformance().filter(p => p.recommendation === 'promote'));
  readonly discountProducts = computed(() => this._productPerformance().filter(p => p.recommendation === 'discount'));
  readonly discontinueProducts = computed(() => this._productPerformance().filter(p => p.recommendation === 'discontinue'));

  refresh(): void {
    this._insights.set(generateMockInsights());
    this._kpis.set(generateKPIs());
    this._categoryPerformance.set(generateCategoryPerformance());
    this._productPerformance.set(generateProductPerformance());
    this._revenueTrend.set(generateRevenueTrend());
    this._channelPerformance.set(generateChannelPerformance());
  }
}