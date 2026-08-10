using Vrindaya.Api.AI.Flipkart.DTOs;

namespace Vrindaya.Api.AI.Flipkart.Interfaces;

/// <summary>
/// Deterministic listing quality engine. Scores a Flipkart listing from 0–100
/// across seven dimensions — title quality, description quality, bullet points,
/// image count, SEO keywords, brand consistency, attribute completeness — and
/// emits actionable improvement suggestions. No AI provider calls, no Firestore.
/// </summary>
public interface IListingQualityEngine
{
    /// <summary>
    /// Evaluates the supplied listing and returns per-dimension scores,
    /// an overall weighted score, and improvement suggestions.
    /// </summary>
    /// <param name="listing">The listing to evaluate.</param>
    /// <returns>A <see cref="ListingQualityResultDto"/> with all scores and suggestions.</returns>
    /// <exception cref="ArgumentNullException">Thrown when <paramref name="listing"/> is null.</exception>
    ListingQualityResultDto Evaluate(ListingEvaluationInput listing);
}
