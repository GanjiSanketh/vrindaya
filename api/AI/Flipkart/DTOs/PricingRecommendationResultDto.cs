namespace Vrindaya.Api.AI.Flipkart.DTOs;

/// <summary>
/// Deterministic pricing recommendation result. Every field is derived from
/// the product's own attributes — no AI, no external APIs, no randomness.
/// </summary>
public sealed class PricingRecommendationResultDto
{
    /// <summary>Product identifier.</summary>
    public string ProductId { get; set; } = string.Empty;

    /// <summary>Product name.</summary>
    public string ProductName { get; set; } = string.Empty;

    /// <summary>Current purchase cost per unit.</summary>
    public double PurchaseCost { get; set; }

    /// <summary>Current selling price per unit.</summary>
    public double CurrentSellingPrice { get; set; }

    /// <summary>Current absolute margin per unit (SellingPrice - PurchaseCost).</summary>
    public double CurrentMargin { get; set; }

    /// <summary>Current margin as a percentage of selling price (0–100).</summary>
    public double CurrentMarginPercentage { get; set; }

    /// <summary>Competitive margin ratio for the product's category (0–1).</summary>
    public double CompetitiveMargin { get; set; }

    /// <summary>Competitive margin as a percentage (0–100).</summary>
    public double CompetitiveMarginPercentage { get; set; }

    /// <summary>Suggested selling price based on competitive positioning.</summary>
    public double SuggestedSellingPrice { get; set; }

    /// <summary>Absolute margin at the suggested price.</summary>
    public double SuggestedMargin { get; set; }

    /// <summary>Minimum safe price (cost + minimum viable margin).</summary>
    public double MinimumSafePrice { get; set; }

    /// <summary>Maximum suggested price (cost + maximum acceptable markup).</summary>
    public double MaximumSuggestedPrice { get; set; }

    /// <summary>Expected profit at suggested price over the projection period.</summary>
    public double ExpectedProfit { get; set; }

    /// <summary>Projected units sold over the projection period.</summary>
    public double ProjectedUnits { get; set; }

    /// <summary>Estimated Flipkart commission rate applied (0–1).</summary>
    public double CommissionRate { get; set; }

    /// <summary>Net margin after commission at suggested price.</summary>
    public double NetMarginAfterCommission { get; set; }
}
