namespace Vrindaya.Api.AI.Flipkart.DTOs;

/// <summary>
/// Aggregated dashboard view for a single product across all Flipkart
/// intelligence modules. Deterministic, no AI calls.
/// </summary>
public sealed class FlipkartDashboardDto
{
    /// <summary>Product identifier.</summary>
    public string ProductId { get; set; } = string.Empty;

    /// <summary>Product name.</summary>
    public string ProductName { get; set; } = string.Empty;

    /// <summary>Product category.</summary>
    public string Category { get; set; } = string.Empty;

    /// <summary>Overall product intelligence score (0–100).</summary>
    public int ProductScore { get; set; }

    /// <summary>Overall listing quality score (0–100).</summary>
    public int ListingScore { get; set; }

    /// <summary>Overall campaign suitability score (0–100).</summary>
    public int CampaignScore { get; set; }

    /// <summary>Composite health score (0–100) — average of all module scores.</summary>
    public int HealthScore { get; set; }

    /// <summary>Product intelligence summary.</summary>
    public ProductIntelligenceSummary ProductIntelligence { get; set; } = new();

    /// <summary>Pricing summary.</summary>
    public PricingSummary Pricing { get; set; } = new();

    /// <summary>Inventory summary.</summary>
    public InventorySummary Inventory { get; set; } = new();

    /// <summary>Listing quality breakdown.</summary>
    public ListingQualityBreakdown ListingQuality { get; set; } = new();

    /// <summary>Campaign suggestion summary.</summary>
    public CampaignSummary Campaign { get; set; } = new();

    /// <summary>Top improvement actions across all modules.</summary>
    public List<string> TopActions { get; set; } = [];
}

/// <summary>
/// Product intelligence summary for the dashboard.
/// </summary>
public sealed class ProductIntelligenceSummary
{
    public double MarginPercentage { get; set; }
    public string StockHealth { get; set; } = string.Empty;
    public string InventoryRisk { get; set; } = string.Empty;
    public double SalesVelocity { get; set; }
    public double? DaysOfInventory { get; set; }
    public string RecommendedAction { get; set; } = string.Empty;
}

/// <summary>
/// Pricing summary for the dashboard.
/// </summary>
public sealed class PricingSummary
{
    public double CurrentPrice { get; set; }
    public double SuggestedPrice { get; set; }
    public double MinimumSafePrice { get; set; }
    public double MaximumSuggestedPrice { get; set; }
    public double CurrentMarginPercentage { get; set; }
    public double ExpectedProfit { get; set; }
    public double ProjectedUnits { get; set; }
}

/// <summary>
/// Inventory summary for the dashboard.
/// </summary>
public sealed class InventorySummary
{
    public int Stock { get; set; }
    public string Action { get; set; } = string.Empty;
    public string Risk { get; set; } = string.Empty;
    public double SalesVelocity { get; set; }
    public double? DaysOfInventory { get; set; }
    public int InventoryAgeDays { get; set; }
    public double? DiscountPercent { get; set; }
    public int? RestockQuantity { get; set; }
}

/// <summary>
/// Listing quality breakdown for the dashboard.
/// </summary>
public sealed class ListingQualityBreakdown
{
    public int TitleScore { get; set; }
    public int DescriptionScore { get; set; }
    public int BulletPointsScore { get; set; }
    public int ImageCountScore { get; set; }
    public int SeoKeywordsScore { get; set; }
    public int BrandConsistencyScore { get; set; }
    public int AttributeCompletenessScore { get; set; }
}

/// <summary>
/// Campaign suggestion summary for the dashboard.
/// </summary>
public sealed class CampaignSummary
{
    public string Objective { get; set; } = string.Empty;
    public string Priority { get; set; } = string.Empty;
    public double ExpectedRoi { get; set; }
    public long EstimatedRevenue { get; set; }
    public double CampaignPrice { get; set; }
}
