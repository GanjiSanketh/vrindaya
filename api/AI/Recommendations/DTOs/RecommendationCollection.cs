namespace Vrindaya.Api.AI.Recommendations.DTOs;

/// <summary>
/// Aggregate recommendation result, grouped by type with generation metadata.
/// </summary>
public sealed class RecommendationCollection
{
    public List<Recommendation> Discount { get; init; } = new();
    public List<Recommendation> Bundle { get; init; } = new();
    public List<Recommendation> Upsell { get; init; } = new();
    public List<Recommendation> CrossSell { get; init; } = new();
    public List<Recommendation> Clearance { get; init; } = new();

    public DateTime GeneratedAt { get; init; } = DateTime.UtcNow;

    public int TotalRecommendations =>
        Discount.Count + Bundle.Count + Upsell.Count + Clearance.Count;
}
