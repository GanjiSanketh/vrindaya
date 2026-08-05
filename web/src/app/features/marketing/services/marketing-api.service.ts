import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { DashboardResponse, RecommendationResponse, ForecastResponse } from '../../../../api/DTOs/Marketing';
import { TrendData } from '../../models/trend-data.model';
import { ContentIdea } from '../../models/content-idea.model';

export interface MarketingDashboard {
  totalRevenue: number;
  revenueGrowth: number;
  orders: number;
  visitors: number;
  conversionRate: number;
  topProduct: string;
}

export interface MarketingRecommendation {
  title: string;
  priority: string;
  description: string;
  expectedImpact: number;
  action: string;
}

export interface MarketingForecast {
  weeklyForecast: number;
  monthlyForecast: number;
  quarterlyForecast: number;
  expectedRevenue: number;
  expectedGrowth: number;
  confidenceScore: number;
}

const URL = `${environment.apiBaseUrl}/marketing`;

@Injectable({ providedIn: 'root' })
export class MarketingApiService {
  private readonly http = inject(HttpClient);

  getDashboard(): Observable<DashboardResponse> {
    return this.http.get<DashboardResponse>(`${URL}/dashboard`);
  }

  getRecommendations(): Observable<RecommendationResponse[]> {
    return this.http.get<RecommendationResponse[]>(`${URL}/recommendations`);
  }

  getForecast(): Observable<ForecastResponse> {
    return this.http.get<ForecastResponse>(`${URL}/forecast`);
  }

  getTrendAnalysis(): Observable<TrendData[]> {
    return this.http.get<TrendData[]>(`${URL}/trends`);
  }

  getContentIdeas(): Observable<ContentIdea[]> {
    return this.http.get<ContentIdea[]>(`${URL}/content-ideas`);
  }
}
