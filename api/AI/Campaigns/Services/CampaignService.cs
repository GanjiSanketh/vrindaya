using Microsoft.Extensions.Logging;
using Vrindaya.Api.AI.Campaigns.Dtos;
using Vrindaya.Api.AI.Campaigns.Interfaces;
using Vrindaya.Api.AI.Campaigns.Models;

namespace Vrindaya.Api.AI.Campaigns.Services;

/// <summary>
/// Default <see cref="ICampaignService"/>. Validates the request, delegates to
/// the <see cref="ICampaignEngine"/>, and logs the outcome.
/// </summary>
public sealed class CampaignService : ICampaignService
{
    private readonly ICampaignEngine _engine;
    private readonly ILogger<CampaignService> _logger;

    /// <summary>Maximum number of campaigns returned per request.</summary>
    private const int MaxCampaignsLimit = 50;

    public CampaignService(ICampaignEngine engine, ILogger<CampaignService> logger)
    {
        _engine = engine ?? throw new ArgumentNullException(nameof(engine));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public Task<CampaignResponseDto> GenerateCampaignsAsync(
        CampaignRequestDto request,
        IReadOnlyList<CampaignProduct> products,
        CancellationToken cancellationToken = default)
    {
        if (request is null)
            throw new ArgumentNullException(nameof(request));

        if (products is null)
            throw new ArgumentNullException(nameof(products));

        if (request.MaximumCampaigns < 1)
            throw new ArgumentException(
                "MaximumCampaigns must be at least 1.", nameof(request));

        if (request.MaximumCampaigns > MaxCampaignsLimit)
        {
            _logger.LogWarning(
                "Requested {Requested} campaigns; clamping to the limit of {Limit}.",
                request.MaximumCampaigns, MaxCampaignsLimit);
            request.MaximumCampaigns = MaxCampaignsLimit;
        }

        var filteredProductIds = request.ProductIds?
            .Where(id => !string.IsNullOrWhiteSpace(id))
            .ToList() ?? new List<string>();

        if (filteredProductIds.Any(id => id.Length == 0))
        {
            _logger.LogWarning(
                "Request contains empty product-id entries; ignoring them.");
        }

        var response = _engine.Generate(request, products);

        _logger.LogInformation(
            "Campaign generation complete: {TotalCampaigns} campaigns from {TotalProducts} products analyzed.",
            response.TotalCampaigns, response.TotalProductsAnalyzed);

        return Task.FromResult(response);
    }
}
