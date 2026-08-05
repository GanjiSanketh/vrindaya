namespace Vrindaya.Api.DTOs.Products;

public class CeoDashboardDto
{
    public BusinessHealthDto BusinessHealth { get; set; } = new();
    public GrowthScoreDto GrowthScore { get; set; } = new();
    public MarketingScoreDto MarketingScore { get; set; } = new();
    public InventoryRiskDto InventoryRisk { get; set; } = new();
    public List<ProductPromotionDto> ProductsToPromote { get; set; } = [];
    public List<ProductDiscountDto> ProductsToDiscount { get; set; } = [];
    public CampaignRecommendationDto RecommendedCampaign { get; set; } = new();
    public List<ContentRecommendationDto> RecommendedReels { get; set; } = [];
    public List<ContentRecommendationDto> RecommendedPosts { get; set; } = [];
    public List<GoalDto> WeeklyGoals { get; set; } = [];
    public List<GoalDto> MonthlyGoals { get; set; } = [];
    public List<GoalDto> QuarterlyGoals { get; set; } = [];
    public RevenueForecastDto RevenueForecast { get; set; } = new();
    public GrowthForecastDto GrowthForecast { get; set; } = new();
    public List<AiRecommendationDto> AiRecommendations { get; set; } = [];
    public List<QuickActionDto> QuickActions { get; set; } = [];
    public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;
}

public class BusinessHealthDto
{
    public int OverallScore { get; set; }
    public string Status { get; set; } = string.Empty;
    public string Trend { get; set; } = string.Empty;
    public double TrendValue { get; set; }
    public List<HealthMetricDto> Metrics { get; set; } = [];
    public List<string> Alerts { get; set; } = [];
}

public class HealthMetricDto
{
    public string Name { get; set; } = string.Empty;
    public int Score { get; set; }
    public string Status { get; set; } = string.Empty;
    public string Trend { get; set; } = string.Empty;
    public double ChangePercent { get; set; }
}

public class GrowthScoreDto
{
    public int Score { get; set; }
    public string Grade { get; set; } = string.Empty;
    public string Trend { get; set; } = string.Empty;
    public double TrendValue { get; set; }
    public List<ScoreComponentDto> Components { get; set; } = [];
    public List<string> Insights { get; set; } = [];
}

public class ScoreComponentDto
{
    public string Name { get; set; } = string.Empty;
    public int Score { get; set; }
    public int Weight { get; set; }
    public string Status { get; set; } = string.Empty;
}

public class MarketingScoreDto
{
    public int Score { get; set; }
    public string Grade { get; set; } = string.Empty;
    public string Trend { get; set; } = string.Empty;
    public double TrendValue { get; set; }
    public List<ScoreComponentDto> Components { get; set; } = [];
    public ChannelPerformanceDto[] Channels { get; set; } = [];
}

public class ChannelPerformanceDto
{
    public string Channel { get; set; } = string.Empty;
    public int Score { get; set; }
    public double Spend { get; set; }
    public double Revenue { get; set; }
    public double Roas { get; set; }
    public string Trend { get; set; } = string.Empty;
}

public class InventoryRiskDto
{
    public int RiskScore { get; set; }
    public string Level { get; set; } = string.Empty;
    public int OutOfStockCount { get; set; }
    public int LowStockCount { get; set; }
    public int OverstockCount { get; set; }
    public double InventoryTurnover { get; set; }
    public double DaysOfInventory { get; set; }
    public List<InventoryRiskItemDto> TopRisks { get; set; } = [];
    public List<string> Recommendations { get; set; } = [];
}

public class InventoryRiskItemDto
{
    public string ProductId { get; set; } = string.Empty;
    public string ProductName { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public int CurrentStock { get; set; }
    public string RiskType { get; set; } = string.Empty;
    public int Severity { get; set; }
    public string Action { get; set; } = string.Empty;
}

public class ProductPromotionDto
{
    public string ProductId { get; set; } = string.Empty;
    public string ProductName { get; set; } = string.Empty;
    public string ImageUrl { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public double CurrentPrice { get; set; }
    public double Margin { get; set; }
    public int Stock { get; set; }
    public int PromotionScore { get; set; }
    public string Reason { get; set; } = string.Empty;
    public List<string> SuggestedChannels { get; set; } = [];
}

public class ProductDiscountDto
{
    public string ProductId { get; set; } = string.Empty;
    public string ProductName { get; set; } = string.Empty;
    public string ImageUrl { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public double CurrentPrice { get; set; }
    public double SuggestedDiscount { get; set; }
    public int Stock { get; set; }
    public int DaysInInventory { get; set; }
    public string Reason { get; set; } = string.Empty;
    public double EstimatedRecovery { get; set; }
}

public class CampaignRecommendationDto
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string TargetAudience { get; set; } = string.Empty;
    public double EstimatedBudget { get; set; }
    public double EstimatedRevenue { get; set; }
    public double EstimatedRoas { get; set; }
    public string Duration { get; set; } = string.Empty;
    public List<string> KeyProducts { get; set; } = [];
    public List<string> Channels { get; set; } = [];
    public List<string> SuccessMetrics { get; set; } = [];
    public int Priority { get; set; }
}

public class ContentRecommendationDto
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public string Format { get; set; } = string.Empty;
    public string Concept { get; set; } = string.Empty;
    public string Hook { get; set; } = string.Empty;
    public List<string> KeyProducts { get; set; } = [];
    public List<string> Hashtags { get; set; } = [];
    public string BestTimeToPost { get; set; } = string.Empty;
    public int EstimatedReach { get; set; }
    public int EstimatedEngagement { get; set; }
    public string Difficulty { get; set; } = string.Empty;
    public int Priority { get; set; }
}

public class GoalDto
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Metric { get; set; } = string.Empty;
    public double CurrentValue { get; set; }
    public double TargetValue { get; set; }
    public double ProgressPercent { get; set; }
    public string Status { get; set; } = string.Empty;
    public string Period { get; set; } = string.Empty;
    public DateTime DueDate { get; set; }
    public List<string> ActionItems { get; set; } = [];
    public int Priority { get; set; }
}

public class RevenueForecastDto
{
    public double CurrentMonthProjected { get; set; }
    public double NextMonthProjected { get; set; }
    public double QuarterProjected { get; set; }
    public double YearProjected { get; set; }
    public double GrowthRate { get; set; }
    public string Confidence { get; set; } = string.Empty;
    public List<ForecastPointDto> MonthlyBreakdown { get; set; } = [];
    public List<string> KeyDrivers { get; set; } = [];
    public List<string> Risks { get; set; } = [];
}

public class ForecastPointDto
{
    public string Month { get; set; } = string.Empty;
    public double Projected { get; set; }
    public double LowerBound { get; set; }
    public double UpperBound { get; set; }
}

public class GrowthForecastDto
{
    public double CurrentGrowthRate { get; set; }
    public double ProjectedGrowthRate { get; set; }
    public string Trend { get; set; } = string.Empty;
    public List<ForecastPointDto> MonthlyGrowth { get; set; } = [];
    public List<string> GrowthLevers { get; set; } = [];
    public List<string> Bottlenecks { get; set; } = [];
}

public class AiRecommendationDto
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string Impact { get; set; } = string.Empty;
    public string Effort { get; set; } = string.Empty;
    public double EstimatedValue { get; set; }
    public int Priority { get; set; }
    public List<string> ActionSteps { get; set; } = [];
    public string Status { get; set; } = string.Empty;
}

public class QuickActionDto
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Icon { get; set; } = string.Empty;
    public string Color { get; set; } = string.Empty;
    public string Route { get; set; } = string.Empty;
    public string ActionType { get; set; } = string.Empty;
    public int Priority { get; set; }
    public bool IsPrimary { get; set; }
}