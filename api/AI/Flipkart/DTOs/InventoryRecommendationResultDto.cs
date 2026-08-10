using Vrindaya.Api.AI.Flipkart.Models;

namespace Vrindaya.Api.AI.Flipkart.DTOs;

/// <summary>
/// Deterministic inventory recommendation result. Every field is derived from
/// the product's own attributes — no AI, no external APIs, no randomness.
/// </summary>
public sealed class InventoryRecommendationResultDto
{
    /// <summary>Product identifier.</summary>
    public string ProductId { get; set; } = string.Empty;

    /// <summary>Product name.</summary>
    public string ProductName { get; set; } = string.Empty;

    /// <summary>Recommended action for this product.</summary>
    public RecommendedAction Action { get; set; }

    /// <summary>Current stock health band.</summary>
    public StockHealth StockHealth { get; set; }

    /// <summary>Current inventory risk level.</summary>
    public InventoryRisk Risk { get; set; }

    /// <summary>Units sold per day since creation.</summary>
    public double SalesVelocity { get; set; }

    /// <summary>Days of inventory remaining at current velocity (null when velocity is zero).</summary>
    public double? DaysOfInventory { get; set; }

    /// <summary>Inventory age in days since creation.</summary>
    public int InventoryAgeDays { get; set; }

    /// <summary>Current margin ratio (0–1).</summary>
    public double MarginRatio { get; set; }

    /// <summary>Suggested discount percentage (0–100) when Action is Discount.</summary>
    public double? DiscountPercent { get; set; }

    /// <summary>Suggested restock quantity when Action is Restock.</summary>
    public int? RestockQuantity { get; set; }

    /// <summary>Human-readable rationale for the recommendation.</summary>
    public string Rationale { get; set; } = string.Empty;
}
