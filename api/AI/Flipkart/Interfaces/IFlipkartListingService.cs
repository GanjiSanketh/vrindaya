using Vrindaya.Api.AI.Flipkart.DTOs;

namespace Vrindaya.Api.AI.Flipkart.Interfaces;

/// <summary>
/// Service for generating complete Flipkart product listings — optimized
/// titles, descriptions, key features, search keywords and SEO metadata —
/// from structured product attributes, using the existing AI orchestrator
/// pipeline with the mock provider (no external LLM calls).
/// </summary>
public interface IFlipkartListingService
{
    /// <summary>
    /// Generates a Flipkart-compliant product listing from the supplied request.
    /// </summary>
    /// <param name="request">Product attributes for listing generation.</param>
    /// <param name="cancellationToken">Optional cancellation token.</param>
    /// <returns>A <see cref="FlipkartListingResponse"/> with title, description, features, keywords, and SEO metadata.</returns>
    Task<FlipkartListingResponse> GenerateListingAsync(
        FlipkartListingRequest request,
        CancellationToken cancellationToken = default);
}
