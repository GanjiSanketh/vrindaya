using System.Diagnostics;
using Vrindaya.Api.AI.Campaigns.Dtos;
using Vrindaya.Api.DTOs.Campaigns;

namespace Vrindaya.Api.AI.Campaigns.Services;

/// <summary>
/// Pure mapping layer that converts internal AI campaign models into
/// API-layer response DTOs. No business logic — only field projection.
/// </summary>
public sealed class CampaignApiResponseMapper
{
    /// <summary>
    /// Converts an internal <see cref="CampaignResponseDto"/> into the
    /// API-facing <see cref="CampaignGenerateResponse"/>.
    /// </summary>
    public CampaignGenerateResponse ToApi(CampaignResponseDto source)
    {
        if (source is null)
            throw new ArgumentNullException(nameof(source));

        var sw = Stopwatch.StartNew();

        var response = new CampaignGenerateResponse
        {
            Campaigns = source.Campaigns?
                .Select(ToApiSuggestion)
                .ToList() ?? new List<CampaignSuggestionDto>(),
            GeneratedAt = source.GeneratedAt,
            GenerationTime = $"{sw.ElapsedMilliseconds}ms",
            TotalProductsAnalyzed = source.TotalProductsAnalyzed,
            TotalCampaigns = source.TotalCampaigns,
        };

        return response;
    }

    /// <summary>
    /// Converts a single internal <see cref="CampaignSuggestionDto"/> into the
    /// API-facing representation. In this iteration the internal and API
    /// suggestion shapes are identical, so this is a shallow projection that
    /// preserves room for future divergence.
    /// </summary>
    private static CampaignSuggestionDto ToApiSuggestion(CampaignSuggestionDto source)
    {
        return new CampaignSuggestionDto
        {
            ProductId = source.ProductId,
            ProductName = source.ProductName,
            Category = source.Category,
            Title = source.Title,
            Objective = source.Objective,
            Rationale = source.Rationale,
            Score = source.Score,
            Priority = source.Priority,
            Confidence = source.Confidence,
            ExpectedRoi = source.ExpectedRoi,
            EstimatedRevenue = source.EstimatedRevenue,
            InstagramCaption = source.InstagramCaption,
            ReelScript = source.ReelScript,
            CarouselSlides = source.CarouselSlides,
            Hashtags = source.Hashtags,
            Cta = source.Cta,
        };
    }
}
