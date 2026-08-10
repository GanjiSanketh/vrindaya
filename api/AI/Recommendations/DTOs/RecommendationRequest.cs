using Vrindaya.Api.AI.Campaigns.Models;

namespace Vrindaya.Api.AI.Recommendations.DTOs;

/// <summary>
/// Input contract for recommendation generation. Products are filtered by the
/// optional category and id whitelist before deterministic rules are applied.
/// No Firestore, no AI inference.
/// </summary>
public sealed class RecommendationRequest
{
    /// <summary>The product pool the engine draws recommendations from.</summary>
    public List<CampaignProduct> Products { get; init; } = new();

    /// <summary>Maximum recommendations to emit per type. 0 = no cap.</summary>
    public int MaxPerType { get; init; } = 5;

    /// <summary>Optional category filter. When set, only products in this category are considered.</summary>
    public string? Category { get; init; }

    /// <summary>Optional product id whitelist. When non-empty, only these products are considered.</summary>
    public List<string> ProductIds { get; init; } = new();
}
