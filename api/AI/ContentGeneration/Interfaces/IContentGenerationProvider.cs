using Vrindaya.Api.AI.ContentGeneration.DTOs;

namespace Vrindaya.Api.AI.ContentGeneration.Interfaces;

/// <summary>
/// Abstraction for an AI-powered content provider. Returns realistic,
/// platform-ready content pieces based on the request and the scored product
/// candidates. Implementations may be real LLM providers or mock providers.
/// </summary>
public interface IContentGenerationProvider
{
    /// <summary>
    /// Generates rich copy for the supplied base content pieces.
    /// </summary>
    /// <param name="request">The original content generation request driving format, tone, audience, and filters.</param>
    /// <param name="pieces">Base pieces produced by the scoring engine.</param>
    /// <param name="cancellationToken">Optional cancellation token.</param>
    /// <returns>A response containing the enriched content pieces.</returns>
    Task<ContentGenerationResponseDto> GenerateAsync(
        ContentGenerationRequestDto request,
        IReadOnlyList<ContentPieceDto> pieces,
        CancellationToken cancellationToken = default);
}