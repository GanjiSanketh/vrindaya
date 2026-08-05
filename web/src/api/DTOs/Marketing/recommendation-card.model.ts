export interface RecommendationCard {
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  impact: string;
  category: string;
  action: string;
  confidence: number;
}