using Vrindaya.Api.AI.Campaigns.Dtos;

namespace Vrindaya.Api.AI.Campaigns.Interfaces;

/// <summary>
/// Abstraction for an AI-powered campaign provider. Returns realistic
/// campaign suggestions based on the request and scored product candidates.
/// Implementations may be real LLM providers or mock providers.
/// </summary>
public interface ICampaignAiProvider
{
    /// <summary>
    /// Generates campaign suggestions for the given request context.
    /// </summary>
    /// <param name="request">The original campaign request driving objective, audience, and filters.</param>
    /// <param name="suggestions">Candidate suggestions from the scoring engine.</param>
    /// <param name="prompt">Optional pre-built prompt string.</param>
    /// <param name="cancellationToken">Optional cancellation token.</param>
    /// <returns>A response containing AI-generated campaign suggestions.</returns>
    Task<CampaignResponseDto> GenerateAsync(
        CampaignRequestDto request,
        IReadOnlyList<CampaignSuggestionDto> suggestions,
        string? prompt = null,
        CancellationToken cancellationToken = default);
}
