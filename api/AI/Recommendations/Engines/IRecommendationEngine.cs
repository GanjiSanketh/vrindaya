namespace Vrindaya.Api.AI.Recommendations.Engines;

/// <summary>
/// Deterministic recommendation generator. Produces five recommendation
/// categories purely from product attributes — no ML models and no randomness.
/// </summary>
public interface IRecommendationEngine
{
    /// <summary>
    /// Generates discount, bundle, upsell, cross-sell and clearance
    /// recommendations for the supplied product pool.
    /// </summary>
    global::Vrindaya.Api.AI.Recommendations.DTOs.RecommendationCollection Generate(
        global::Vrindaya.Api.AI.Recommendations.DTOs.RecommendationRequest request);
}
