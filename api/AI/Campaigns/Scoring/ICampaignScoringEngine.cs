using Vrindaya.Api.AI.Campaigns.Models;

namespace Vrindaya.Api.AI.Campaigns.Scoring;

/// <summary>
/// Deterministic campaign-readiness scorer. Given a product and a seasonality
/// signal, produces a 0..100 score used to rank campaign suggestions.
/// </summary>
public interface ICampaignScoringEngine
{
    /// <summary>
    /// Computes a deterministic 0..100 campaign score for a product.
    /// </summary>
    /// <param name="product">The product to score.</param>
    /// <param name="seasonalityScore">
    /// External relevance signal (0..100) capturing how well the product fits
    /// the current season/festival. Provided by the caller; this engine only
    /// weighs it.
    /// </param>
    int Score(CampaignProduct product, int seasonalityScore);
}