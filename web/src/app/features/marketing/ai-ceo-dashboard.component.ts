import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { MarketingApiService } from './services/marketing-api.service';

interface ForecastCard {
  label: string;
  value: string;
  trend: string;
  trendUp: boolean;
  icon: string;
  color: string;
  spark: number[];
}

interface SummaryCard {
  label: string;
  value: string;
  subValue: string;
  icon: string;
  color: string;
  confidence: number;
}

interface RecommendationCard {
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  impact: string;
  category: string;
  action: string;
  confidence: number;
  icon: string;
  color: string;
}

@Component({
  selector: 'app-ai-ceo-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ai-ceo-dashboard.component.html',
  styleUrl: './ai-ceo-dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AiCeoDashboardComponent implements OnInit {
  readonly marketingApi = inject(MarketingApiService);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly weeklyForecast = signal<ForecastCard>({
    label: 'Weekly Forecast',
    value: '₹0',
    trend: '+0%',
    trendUp: true,
    icon: 'bi-calendar-week',
    color: '#0f6f84',
    spark: [],
  });

  readonly monthlyForecast = signal<ForecastCard>({
    label: 'Monthly Forecast',
    value: '₹0',
    trend: '+0%',
    trendUp: true,
    icon: 'bi-calendar-month',
    color: '#22a34a',
    spark: [],
  });

  readonly quarterlyForecast = signal<ForecastCard>({
    label: 'Quarterly Forecast',
    value: '₹0',
    trend: '+0%',
    trendUp: true,
    icon: 'bi-calendar3',
    color: '#c9a54c',
    spark: [],
  });

  readonly expectedRevenue = signal<SummaryCard>({
    label: 'Expected Revenue',
    value: '₹18.5 Cr',
    subValue: 'Next Quarter',
    icon: 'bi-currency-rupee',
    color: '#06b6d4',
    confidence: 87,
  });

  readonly expectedGrowth = signal<SummaryCard>({
    label: 'Expected Growth',
    value: '24.8%',
    subValue: 'YoY Projection',
    icon: 'bi-graph-up',
    color: '#8b5cf6',
    confidence: 82,
  });

  readonly confidenceScore = signal<SummaryCard>({
    label: 'Confidence Score',
    value: '85%',
    subValue: 'Model Accuracy',
    icon: 'bi-award',
    color: '#ec4899',
    confidence: 85,
  });

  readonly recommendations = signal<RecommendationCard[]>([]);

  async ngOnInit() {
    try {
      const f = await firstValueFrom(this.marketingApi.getForecast());
      if (f) {
        this.weeklyForecast.set({
          label: 'Weekly Forecast',
          value: this.formatCurrency(f.weeklyForecast),
          trend: this.formatTrend(f.weeklyForecast),
          trendUp: f.weeklyForecast >= 0,
          icon: 'bi-calendar-week',
          color: '#0f6f84',
          spark: this.generateSpark(f.weeklyForecast),
        });
        this.monthlyForecast.set({
          label: 'Monthly Forecast',
          value: this.formatCurrency(f.monthlyForecast),
          trend: this.formatTrend(f.monthlyForecast),
          trendUp: f.monthlyForecast >= 0,
          icon: 'bi-calendar-month',
          color: '#22a34a',
          spark: this.generateSpark(f.monthlyForecast),
        });
        this.quarterlyForecast.set({
          label: 'Quarterly Forecast',
          value: this.formatCurrency(f.quarterlyForecast),
          trend: this.formatTrend(f.quarterlyForecast),
          trendUp: f.quarterlyForecast >= 0,
          icon: 'bi-calendar3',
          color: '#c9a54c',
          spark: this.generateSpark(f.quarterlyForecast),
        });
      }
    } catch (e: any) {
      this.error.set(e?.message ?? 'Failed to load forecast data');
    }

    try {
      const d = await firstValueFrom(this.marketingApi.getDashboard());
      if (d) {
        this.expectedRevenue.set({
          label: 'Expected Revenue',
          value: this.formatCurrency(d.expectedRevenue),
          subValue: 'Next Quarter',
          icon: 'bi-currency-rupee',
          color: '#06b6d4',
          confidence: d.expectedRevenueConfidence ?? 87,
        });
        this.expectedGrowth.set({
          label: 'Expected Growth',
          value: this.formatPercent(d.expectedGrowth),
          subValue: 'YoY Projection',
          icon: 'bi-graph-up',
          color: '#8b5cf6',
          confidence: d.expectedGrowthConfidence ?? 82,
        });
        this.confidenceScore.set({
          label: 'Confidence Score',
          value: this.formatPercent(d.confidenceScore),
          subValue: 'Model Accuracy',
          icon: 'bi-award',
          color: '#ec4899',
          confidence: d.confidenceScore ?? 85,
        });
      }
    } catch (e: any) {
      this.error.set(e?.message ?? 'Failed to load dashboard data');
    }

    try {
      const recs = await firstValueFrom(this.marketingApi.getRecommendations());
      if (recs) {
        this.recommendations.set(recs.map(r => ({
          title: r.title,
          priority: (r.priority ?? 'medium') as 'high' | 'medium' | 'low',
          description: r.description,
          impact: this.formatImpact(r.expectedImpact),
          category: r.category,
          action: r.action,
          confidence: r.confidence,
          icon: this.getIcon(r.priority),
          color: this.getColor(r.priority),
        })));
      }
    } catch (e: any) {
      this.error.set(e?.message ?? 'Failed to load recommendations');
    } finally {
      this.loading.set(false);
    }
  }

  private formatCurrency(value: number): string {
    if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)} Cr`;
    if (value >= 100000) return `₹${(value / 100000).toFixed(1)} L`;
    return `₹${value}`;
  }

  confidenceColor(confidence: number): string {
    if (confidence >= 80) return '#198754';
    if (confidence >= 60) return '#fd7e14';
    return '#dc3545';
  }

  private formatTrend(value: number): string {
    const prefix = value >= 0 ? '+' : '';
    return `${prefix}${value.toFixed(1)}%`;
  }

  private formatPercent(value: number): string {
    return `${value}%`;
  }

  private formatImpact(value: number): string {
    if (value >= 10000000) return `+₹${(value / 10000000).toFixed(1)} Cr projected revenue`;
    if (value >= 100000) return `+₹${(value / 100000).toFixed(1)}L`;
    return `+${value}`;
  }

  private generateSpark(baseValue: number): number[] {
    const values: number[] = [];
    const step = baseValue / 7;
    for (let i = 0; i < 7; i++) {
      values.push(Math.round((step * (i + 1)) / baseValue * 100));
    }
    return values;
  }

  private getIcon(priority: string): string {
    switch (priority.toLowerCase()) {
      case 'high': return 'bi-rocket-takeoff';
      case 'medium': return 'bi-tag';
      default: return 'bi-envelope';
    }
  }

  private getColor(priority: string): string {
    switch (priority.toLowerCase()) {
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      default: return '#8b5cf6';
    }
  }
}