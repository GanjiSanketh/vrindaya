using Vrindaya.Api.AI.Campaigns.Dtos;
using Vrindaya.Api.AI.Flipkart.DTOs;
using Vrindaya.Api.AI.Recommendations.DTOs;

namespace Vrindaya.Api.AI.Dashboard.DTOs;

/// <summary>
/// Aggregated business dashboard view. Each section is produced by an existing
/// intelligence module and is reproduced here unchanged — this DTO adds only
/// the cross-module roll-up in <see cref="Summary"/>.
/// </summary>
public sealed class DashboardInsightsDto
{
    /// <summary>Cross-module roll-up of the aggregated sections.</summary>
    public DashboardSummaryDto Summary { get; set; } = new();

    /// <summary>Per-product intelligence, ordered by overall product score descending.</summary>
    public List<ProductIntelligenceResultDto> ProductIntelligence { get; set; } = [];

    /// <summary>Discount, bundle, upsell, cross-sell and clearance recommendations.</summary>
    public RecommendationCollection Recommendations { get; set; } = new();

    /// <summary>Ranked campaign suggestions from the campaign engine.</summary>
    public CampaignResponseDto Campaigns { get; set; } = new();

    /// <summary>Listing quality results, ordered by overall score ascending (worst first).</summary>
    public List<DashboardListingQualityDto> ListingQuality { get; set; } = [];

    /// <summary>Inventory recommendations, ordered by risk severity descending.</summary>
    public List<InventoryRecommendationResultDto> InventoryStatus { get; set; } = [];

    public DateTime GeneratedAt { get; set; }
}

/// <summary>
/// Cross-module roll-up shown at the top of the dashboard.
/// </summary>
public sealed class DashboardSummaryDto
{
    public int TotalProductsAnalyzed { get; set; }

    /// <summary>Mean product intelligence score across the pool (0-100).</summary>
    public int AverageProductScore { get; set; }

    /// <summary>Mean listing quality score across the evaluated listings (0-100).</summary>
    public int AverageListingScore { get; set; }

    /// <summary>Composite of the product, listing and campaign averages (0-100).</summary>
    public int HealthScore { get; set; }

    /// <summary>Products flagged Critical or High by the inventory module.</summary>
    public int ProductsAtRisk { get; set; }

    /// <summary>Products the inventory module recommends restocking.</summary>
    public int ProductsNeedingRestock { get; set; }

    /// <summary>Products the inventory module recommends liquidating.</summary>
    public int OverstockedProducts { get; set; }

    public int TotalRecommendations { get; set; }

    public int TotalCampaigns { get; set; }

    /// <summary>Highest-value next actions collected across every module.</summary>
    public List<string> TopActions { get; set; } = [];
}

/// <summary>
/// Listing quality result paired with the product it belongs to.
/// </summary>
public sealed class DashboardListingQualityDto
{
    public string ProductId { get; set; } = string.Empty;

    public string ProductName { get; set; } = string.Empty;

    public ListingQualityResultDto Quality { get; set; } = new();
}
