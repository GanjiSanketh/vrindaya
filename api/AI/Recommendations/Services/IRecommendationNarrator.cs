using Vrindaya.Api.AI.Recommendations.DTOs;

namespace Vrindaya.Api.AI.Recommendations.Services;

/// <summary>
/// Rewrites the deterministic engine's terse, metric-derived reasons into
/// merchandiser-facing explanations using the configured AI provider.
///
/// Narration only: the recommendation set, its ordering, confidence scores and
/// ROI figures are produced by <see cref="Engines.IRecommendationEngine"/> and
/// are never changed here. If the model returns nothing usable, the engine's
/// original reasons are kept.
/// </summary>
public interface IRecommendationNarrator
{
    /// <summary>
    /// Returns the collection with AI-written reasons where available.
    /// </summary>
    /// <param name="collection">The engine's recommendation set.</param>
    /// <param name="cancellationToken">Optional cancellation token.</param>
    /// <returns>The same recommendations, with narrated reasons applied.</returns>
    Task<RecommendationCollection> NarrateAsync(
        RecommendationCollection collection,
        CancellationToken cancellationToken = default);
}
