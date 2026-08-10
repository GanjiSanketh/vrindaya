using Vrindaya.Api.AI.Campaigns.Dtos;
using Vrindaya.Api.AI.Campaigns.Models;

namespace Vrindaya.Api.AI.Campaigns.Interfaces;

/// <summary>
/// Deterministic campaign-generation engine. Produces a ranked list of
/// campaign suggestions for a pool of products, using the scoring engine
/// for product-level evaluation. No ML models, no randomness — repeated
/// runs over the same input always yield the same output.
/// </summary>
public interface ICampaignEngine
{
    /// <summary>
    /// Generates campaign suggestions for the supplied product pool, ordered
    /// by score descending and capped at the request's <see cref="CampaignRequestDto.MaximumCampaigns"/>.
    /// </summary>
    /// <param name="request">Generation parameters (objective, platform, filters, etc.).</param>
    /// <param name="products">The product pool to draw suggestions from.</param>
    /// <returns>A response containing the ordered suggestions plus metadata.</returns>
    CampaignResponseDto Generate(CampaignRequestDto request, IReadOnlyList<CampaignProduct> products);
}
