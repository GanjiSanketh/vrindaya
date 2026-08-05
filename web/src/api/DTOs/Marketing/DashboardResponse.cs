using System.Collections.Generic;

namespace Api.DTOs.Marketing
{
    public class DashboardResponse
    {
        public RevenueForecast RevenueForecast { get; set; }
        public GrowthForecast GrowthForecast { get; set; }
        public ConfidenceScore ConfidenceScore { get; set; }
        public List<RecommendationCard> TopRecommendations { get; set; }
    }

    public class RevenueForecast
    {
        public double WeeklyForecast { get; set; }
        public double MonthlyForecast { get; set; }
        public double QuarterlyForecast { get; set; }
    }

    public class GrowthForecast
    {
        public double ExpectedRevenue { get; set; }
        public double ExpectedGrowth { get; set; }
    }

    public class ConfidenceScore
    {
        public int Score { get; set; }
        public string ModelAccuracy { get; set; }
    }
}