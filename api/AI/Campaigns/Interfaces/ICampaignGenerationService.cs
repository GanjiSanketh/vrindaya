using Vrindaya.Api.AI.Campaigns.Dtos;

namespace Vrindaya.Api.AI.Campaigns.Interfaces;

/// <summary>
/// High-level campaign generation service. Orchestrates the deterministic
/// <see cref="ICampaignEngine"/> and the <see cref="Scoring.ICampaignScoringEngine"/>
/// to retrieve candidate products, score them, select the best, and produce
/// a ranked list of campaign suggestions. No AI provider is invoked.
/// </summary>
public interface ICampaignGenerationService
{
    /// <summary>
    /// Generates campaign suggestions from the supplied request.
    /// </summary>
    /// <param name="request">Generation parameters (objective, platform, filters, etc.).</param>
    /// <param name="cancellationToken">Optional cancellation token.</param>
    /// <returns>A response containing ordered suggestions plus metadata.</returns>
    Task<CampaignResponseDto> GenerateCampaignsAsync(
        CampaignRequestDto request,
        CancellationToken cancellationToken = default);
}
