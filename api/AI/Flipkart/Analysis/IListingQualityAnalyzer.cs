using Vrindaya.Api.AI.Flipkart.DTOs;

namespace Vrindaya.Api.AI.Flipkart.Analysis;

/// <summary>
/// Analyzes a generated Flipkart listing (<see cref="FlipkartListingRequest"/> +
/// <see cref="FlipkartListingResponse"/>) and returns heuristic quality scores
/// and improvement suggestions. Fully deterministic — no AI provider calls.
/// </summary>
public interface IListingQualityAnalyzer
{
    /// <summary>
    /// Scores the supplied listing across SEO, readability, keyword density,
    /// customer appeal and Flipkart optimization, returning improvement suggestions.
    /// </summary>
    ListingQualityAnalysis Analyze(
        FlipkartListingRequest request,
        FlipkartListingResponse response);
}
