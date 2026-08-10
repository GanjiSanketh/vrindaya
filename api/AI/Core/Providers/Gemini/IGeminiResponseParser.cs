using Vrindaya.Api.AI.Campaigns.Dtos;
using Vrindaya.Api.AI.ContentGeneration.DTOs;
using Vrindaya.Api.AI.Flipkart.DTOs;
using Vrindaya.Api.AI.Core.Providers.Gemini.Models;

namespace Vrindaya.Api.AI.Core.Providers.Gemini;

/// <summary>
/// Translates raw Gemini output into the module DTOs the rest of the platform
/// already speaks: campaign responses, content generation responses and
/// Flipkart responses.
///
/// Parsing is total — a malformed, fenced, truncated or entirely absent payload
/// yields <c>null</c> rather than an exception, so callers keep their existing
/// deterministic fallbacks. No DTO is invented here; every output type is an
/// existing module contract.
/// </summary>
public interface IGeminiResponseParser
{
    /// <summary>
    /// Parses candidate text (or a <see cref="GeminiPromptResult"/> payload)
    /// into a <see cref="CampaignResponseDto"/>.
    /// </summary>
    /// <param name="text">Raw model text, optionally wrapped in a markdown fence.</param>
    /// <returns>The parsed response, or <c>null</c> when no campaign could be read.</returns>
    CampaignResponseDto? ParseCampaigns(string? text);

    /// <summary>
    /// Parses candidate text into a <see cref="ContentGenerationResponseDto"/>.
    /// </summary>
    /// <param name="text">Raw model text, optionally wrapped in a markdown fence.</param>
    /// <returns>The parsed response, or <c>null</c> when no piece could be read.</returns>
    ContentGenerationResponseDto? ParseContent(string? text);

    /// <summary>
    /// Parses candidate text into a <see cref="FlipkartResponseDto"/>.
    /// </summary>
    /// <param name="text">Raw model text, optionally wrapped in a markdown fence.</param>
    /// <returns>The parsed response, or <c>null</c> when no suggestion could be read.</returns>
    FlipkartResponseDto? ParseFlipkart(string? text);

    /// <summary>
    /// Parses candidate text into a <see cref="FlipkartListingResponse"/> —
    /// the single-listing contract used by the Flipkart listing service.
    /// </summary>
    /// <param name="text">Raw model text, optionally wrapped in a markdown fence.</param>
    /// <returns>The parsed listing, or <c>null</c> when no usable listing could be read.</returns>
    FlipkartListingResponse? ParseFlipkartListing(string? text);
}
