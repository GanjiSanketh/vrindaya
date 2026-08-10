using Microsoft.Extensions.Logging;
using Vrindaya.Api.AI.Campaigns.Dtos;
using Vrindaya.Api.AI.Campaigns.Interfaces;
using Vrindaya.Api.AI.Core.Interfaces;

namespace Vrindaya.Api.AI.Campaigns.Services;

/// <summary>
/// Default <see cref="ICampaignGenerationService"/>. Accepts a
/// <see cref="CampaignRequestDto"/> and delegates campaign generation to the
/// core <see cref="IAiOrchestrator"/>, which routes the request to the
/// configured AI provider and returns the generated marketing content.
///
/// The copy (captions, reel scripts, carousel slides, hashtags, CTA) is
/// produced by whichever provider the "AI:Provider" setting selects — real
/// Gemini output when Gemini is active, deterministic content otherwise.
/// </summary>
public sealed class CampaignGenerationService : ICampaignGenerationService
{
    private readonly IAiOrchestrator _aiOrchestrator;
    private readonly ILogger<CampaignGenerationService> _logger;

    public CampaignGenerationService(
        IAiOrchestrator aiOrchestrator,
        ILogger<CampaignGenerationService> logger)
    {
        _aiOrchestrator = aiOrchestrator ?? throw new ArgumentNullException(nameof(aiOrchestrator));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public async Task<CampaignResponseDto> GenerateCampaignsAsync(
        CampaignRequestDto request,
        CancellationToken cancellationToken = default)
    {
        if (request is null)
            throw new ArgumentNullException(nameof(request));

        if (request.MaximumCampaigns < 1)
            throw new ArgumentException(
                "MaximumCampaigns must be at least 1.", nameof(request));

        _logger.LogInformation(
            "Campaign generation starting — delegating to the AI orchestrator.");

        var response = await _aiOrchestrator.GenerateCampaignsAsync(request, cancellationToken);

        _logger.LogInformation(
            "Campaign generation complete via AiOrchestrator: " +
            "{TotalCampaigns} campaigns returned.",
            response.TotalCampaigns);

        return response;
    }
}