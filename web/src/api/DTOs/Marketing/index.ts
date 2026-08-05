export interface DashboardResponse {
  expectedRevenue: number;
  expectedRevenueConfidence: number;
  expectedGrowth: number;
  expectedGrowthConfidence: number;
  confidenceScore: number;
}

export interface RecommendationResponse {
  title: string;
  priority: string;
  description: string;
  expectedImpact: number;
  action: string;
  category: string;
  confidence: number;
}

export interface ForecastResponse {
  weeklyForecast: number;
  monthlyForecast: number;
  quarterlyForecast: number;
  expectedRevenue: number;
  expectedGrowth: number;
  confidenceScore: number;
}