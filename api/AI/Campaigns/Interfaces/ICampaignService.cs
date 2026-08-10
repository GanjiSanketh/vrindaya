using Vrindaya.Api.AI.Campaigns.Dtos;
using Vrindaya.Api.AI.Campaigns.Models;

namespace Vrindaya.Api.AI.Campaigns.Interfaces;

/// <summary>
/// Campaign generation service — orchestrates the engine, validates input,
/// and provides a single entry point for consumers.
/// </summary>
public interface ICampaignService
{
    /// <summary>
    /// Generates campaign suggestions for the supplied product pool.
    /// </summary>
    /// <param name="request">Generation parameters (objective, platform, filters, etc.).</param>
    /// <param name="products">The product pool to draw suggestions from.</param>
    /// <param name="cancellationToken">Optional cancellation token.</param>
    /// <returns>A response containing the ordered suggestions plus metadata.</returns>
    /// <exception cref="ArgumentNullException">Thrown when <paramref name="request"/> or <paramref name="products"/> is null.</exception>
    /// <exception cref="ArgumentException">Thrown when <see cref="CampaignRequestDto.MaximumCampaigns"/> is less than 1.</exception>
    Task<CampaignResponseDto> GenerateCampaignsAsync(
        CampaignRequestDto request,
        IReadOnlyList<CampaignProduct> products,
        CancellationToken cancellationToken = default);
}
