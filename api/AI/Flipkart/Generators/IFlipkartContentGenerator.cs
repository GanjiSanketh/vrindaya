using Vrindaya.Api.AI.Flipkart.DTOs;
using Vrindaya.Api.AI.Flipkart.Prompts;

namespace Vrindaya.Api.AI.Flipkart.Generators;

/// <summary>
/// Generates a complete set of Flipkart listing content — optimized title,
/// detailed description, feature bullets, backend search keywords, meta
/// title, meta description, image alt text, product highlights, lifestyle
/// description, Flipkart search tags and packaging notes — from structured
/// product attributes.
///
/// The copy fields are produced by sending the specialised prompts authored by
/// <see cref="IFlipkartPromptBuilder"/> through the core AI orchestrator, so
/// they are real model output when Gemini is the configured provider.
///
/// Structural fields stay deterministic: the listing title follows Flipkart's
/// fixed attribute ordering, the search tags are kebab-cased attributes, and
/// <see cref="BuildVideoPrompt"/> emits compliance-bound video guidance that the
/// listing service reuses for <see cref="FlipkartListingResponse.VideoPrompt"/>.
/// </summary>
public interface IFlipkartContentGenerator
{
    /// <summary>
    /// Generates a complete Flipkart listing content bundle.
    /// </summary>
    /// <param name="request">Product attributes for listing generation.</param>
    /// <param name="cancellationToken">Optional cancellation token.</param>
    /// <returns>A <see cref="FlipkartContentResponse"/> with all listing components.</returns>
    Task<FlipkartContentResponse> GenerateContentAsync(
        FlipkartListingRequest request,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Builds a structured, Flipkart-compliant video-generation prompt for the
    /// supplied product, specifying camera movement, lighting, background,
    /// model instructions, product focus, duration and Flipkart compliance.
    /// Deterministic — this composes a prompt, so no AI call is made.
    /// </summary>
    string BuildVideoPrompt(FlipkartListingRequest request);
}
