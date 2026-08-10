namespace Vrindaya.Api.AI.Flipkart.DTOs;

/// <summary>
/// A campaign suggestion derived from product intelligence, listing quality,
/// inventory and pricing recommendations. Contains no marketing copy — only
/// structured recommendation data. Deterministic, no AI calls.
/// </summary>
public sealed class CampaignSuggestionResultDto
{
    /// <summary>Product identifier.</summary>
    public string ProductId { get; set; } = string.Empty;

    /// <summary>Product name.</summary>
    public string ProductName { get; set; } = string.Empty;

    /// <summary>Product category.</summary>
    public string Category { get; set; } = string.Empty;

    /// <summary>Recommended campaign objective for this product.</summary>
    public CampaignObjectiveType Objective { get; set; }

    /// <summary>Campaign priority level.</summary>
    public CampaignSuggestionPriority Priority { get; set; }

    /// <summary>Overall campaign suitability score (0–100).</summary>
    public int Score { get; set; }

    /// <summary>Expected return on investment multiplier.</summary>
    public double ExpectedRoi { get; set; }

    /// <summary>Estimated revenue from this campaign.</summary>
    public long EstimatedRevenue { get; set; }

    /// <summary>Recommended selling price for the campaign.</summary>
    public double CampaignPrice { get; set; }

    /// <summary>Suggested discount percentage (0–100) if applicable.</summary>
    public double? DiscountPercent { get; set; }

    /// <summary>Suggested restock quantity if applicable.</summary>
    public int? RestockQuantity { get; set; }

    /// <summary>Human-readable rationale for the suggestion.</summary>
    public string Rationale { get; set; } = string.Empty;

    /// <summary>Product intelligence score (0–100).</summary>
    public int ProductScore { get; set; }

    /// <summary>Listing quality score (0–100).</summary>
    public int ListingScore { get; set; }

    /// <summary>Inventory action recommendation.</summary>
    public string InventoryAction { get; set; } = string.Empty;

    /// <summary>Inventory risk level.</summary>
    public string InventoryRisk { get; set; } = string.Empty;
}

/// <summary>
/// Campaign objective types derived from product and inventory signals.
/// </summary>
public enum CampaignObjectiveType
{
    IncreaseSales,
    ClearInventory,
    LaunchProduct,
    Promote,
    Discount,
    RestockAndPromote,
    Hold,
}

/// <summary>
/// Priority level for a campaign suggestion.
/// </summary>
public enum CampaignSuggestionPriority
{
    Low,
    Medium,
    High,
    Critical,
}
