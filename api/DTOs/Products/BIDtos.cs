namespace Vrindaya.Api.DTOs.Products;

public class BIDashboardDto
{
    public SalesTrendInsight SalesTrendInsight { get; set; } = new();
    public CategoryTrendInsight CategoryTrendInsight { get; set; } = new();
    public ProductPromotionInsight ProductPromotionInsight { get; set; } = new();
    public CampaignRecommendationInsight CampaignRecommendationInsight { get; set; } = new();
    public List<InsightCardDto> KeyInsights { get; set; } = [];
    public List<ChartDataPoint> RevenueTrend { get; set; } = [];
    public List<ChartDataPoint> CategoryGrowth { get; set; } = [];
    public List<ChartDataPoint> TopDecliningProducts { get; set; } = [];
    public List<ChartDataPoint> TopGrowingProducts { get; set; } = [];
}

public class SalesTrendInsight
{
    public string Summary { get; set; } = string.Empty;
    public string RootCause { get; set; } = string.Empty;
    public double RevenueChangePercent { get; set; }
    public double OrderChangePercent { get; set; }
    public double AOVChangePercent { get; set; }
    public List<string> ContributingFactors { get; set; } = [];
    public List<string> RecommendedActions { get; set; } = [];
    public string Severity { get; set; } = "Low";
}

public class CategoryTrendInsight
{
    public string TrendingCategory { get; set; } = string.Empty;
    public double GrowthRate { get; set; }
    public string TrendDirection { get; set; } = "Up";
    public List<CategoryTrendItem> CategoryTrends { get; set; } = [];
    public List<string> Insights { get; set; } = [];
    public List<string> RecommendedActions { get; set; } = [];
}

public class CategoryTrendItem
{
    public string Category { get; set; } = string.Empty;
    public double GrowthRate { get; set; }
    public double Revenue { get; set; }
    public int Orders { get; set; }
    public string Trend { get; set; } = "Stable";
}

public class ProductPromotionInsight
{
    public string RecommendedProductId { get; set; } = string.Empty;
    public string RecommendedProductName { get; set; } = string.Empty;
    public string? ProductImageUrl { get; set; }
    public string Category { get; set; } = string.Empty;
    public double CurrentMargin { get; set; }
    public double PotentialRevenue { get; set; }
    public string PromotionReason { get; set; } = string.Empty;
    public List<string> PromotionStrategies { get; set; } = [];
    public List<AlternativeProductDto> Alternatives { get; set; } = [];
}

public class AlternativeProductDto
{
    public string ProductId { get; set; } = string.Empty;
    public string ProductName { get; set; } = string.Empty;
    public string? ProductImageUrl { get; set; }
    public string Category { get; set; } = string.Empty;
    public double Score { get; set; }
    public string Reason { get; set; } = string.Empty;
}

public class CampaignRecommendationInsight
{
    public string CampaignType { get; set; } = string.Empty;
    public string CampaignName { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string TargetAudience { get; set; } = string.Empty;
    public List<string> KeyProducts { get; set; } = [];
    public List<string> Channels { get; set; } = [];
    public string EstimatedROI { get; set; } = string.Empty;
    public string BudgetRecommendation { get; set; } = string.Empty;
    public List<string> SuccessMetrics { get; set; } = [];
    public List<string> Timeline { get; set; } = [];
}

public class InsightCardDto
{
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Icon { get; set; } = string.Empty;
    public string Color { get; set; } = string.Empty;
    public string Metric { get; set; } = string.Empty;
    public string Trend { get; set; } = string.Empty;
    public string TrendDirection { get; set; } = "neutral";
    public InsightType Type { get; set; } = InsightType.Info;
}

public enum InsightType
{
    Info,
    Warning,
    Critical,
    Opportunity
}