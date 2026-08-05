import { RecommendationCard } from './recommendation-card.model';

export interface RevenueForecast {
  weeklyForecast: number;
  monthlyForecast: number;
  quarterlyForecast: number;
}

export interface GrowthForecast {
  expectedRevenue: number;
  expectedGrowth: number;
}

export interface ConfidenceScore {
  score: number;
  modelAccuracy: string;
}

export interface DashboardResponse {
  revenueForecast: RevenueForecast;
  growthForecast: GrowthForecast;
  confidenceScore: ConfidenceScore;
  topRecommendations: RecommendationCard[];
}