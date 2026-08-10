using Vrindaya.Api.AI.Recommendations.Models;

namespace Vrindaya.Api.AI.Recommendations.DTOs;

/// <summary>
/// A single product-level recommendation. Every recommendation is derived
/// deterministically from product attributes — no ML models and no randomness.
/// </summary>
public sealed class Recommendation
{
    public string ProductId { get; init; } = string.Empty;
    public string ProductName { get; init; } = string.Empty;
    public string Category { get; init; } = string.Empty;

    /// <summary>Which of the five recommendation categories this is.</summary>
    public RecommendationType Type { get; init; }

    /// <summary>Human-readable explanation of why this product was selected.</summary>
    public string Reason { get; init; } = string.Empty;

    /// <summary>Confidence in the recommendation, normalized to 0..1.</summary>
    public double ConfidenceScore { get; init; }

    /// <summary>Estimated return on investment as a ratio (e.g. 3.5 = 3.5x).</summary>
    public double ExpectedROI { get; init; }
}
