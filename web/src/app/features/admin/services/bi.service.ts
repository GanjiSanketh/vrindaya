import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface ChartDataPoint {
  label: string;
  value: number;
}

export interface SalesTrendInsight {
  summary: string;
  rootCause: string;
  revenueChangePercent: number;
  orderChangePercent: number;
  aovChangePercent: number;
  contributingFactors: string[];
  recommendedActions: string[];
  severity: string;
}

export interface CategoryTrendItem {
  category: string;
  growthRate: number;
  revenue: number;
  orders: number;
  trend: string;
}

export interface CategoryTrendInsight {
  trendingCategory: string;
  growthRate: number;
  trendDirection: string;
  categoryTrends: CategoryTrendItem[];
  insights: string[];
  recommendedActions: string[];
}

export interface AlternativeProductDto {
  productId: string;
  productName: string;
  productImageUrl: string | null;
  category: string;
  score: number;
  reason: string;
}

export interface ProductPromotionInsight {
  recommendedProductId: string;
  recommendedProductName: string;
  productImageUrl: string | null;
  category: string;
  currentMargin: number;
  potentialRevenue: number;
  promotionReason: string;
  promotionStrategies: string[];
  alternatives: AlternativeProductDto[];
}

export interface CampaignRecommendationInsight {
  campaignType: string;
  campaignName: string;
  description: string;
  targetAudience: string;
  keyProducts: string[];
  channels: string[];
  estimatedROI: string;
  budgetRecommendation: string;
  successMetrics: string[];
  timeline: string[];
}

export interface InsightCardDto {
  title: string;
  description: string;
  icon: string;
  color: string;
  metric: string;
  trend: string;
  trendDirection: string;
  type: 'Info' | 'Warning' | 'Critical' | 'Opportunity';
}

export interface BIDashboardDto {
  salesTrendInsight: SalesTrendInsight;
  categoryTrendInsight: CategoryTrendInsight;
  productPromotionInsight: ProductPromotionInsight;
  campaignRecommendationInsight: CampaignRecommendationInsight;
  keyInsights: InsightCardDto[];
  revenueTrend: ChartDataPoint[];
  categoryGrowth: ChartDataPoint[];
  topDecliningProducts: ChartDataPoint[];
  topGrowingProducts: ChartDataPoint[];
}

const URL = `${environment.apiBaseUrl}/bi`;

@Injectable({ providedIn: 'root' })
export class BIService {
  private readonly http = inject(HttpClient);

  getBIDashboard(): Promise<BIDashboardDto> {
    return firstValueFrom(this.http.get<BIDashboardDto>(URL));
  }
}