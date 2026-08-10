using Microsoft.Extensions.Logging;
using Vrindaya.Api.AI.Campaigns.Dtos;
using Vrindaya.Api.AI.Campaigns.Interfaces;
using Vrindaya.Api.AI.Campaigns.Models;
using Vrindaya.Api.AI.Campaigns.Prompts;
using Vrindaya.Api.AI.Core.Interfaces;

namespace Vrindaya.Api.AI.Campaigns.Services;

/// <summary>
/// Default <see cref="ICampaignAiProvider"/>. Builds a campaign brief from the
/// scored candidates with the shared <see cref="IPromptBuilder"/>, routes it
/// through the core <see cref="IAiOrchestrator"/> and shapes the model's copy
/// back onto the scored suggestions.
///
/// The engine's numbers are authoritative: score, priority, confidence, ROI and
/// revenue always come from the deterministic scoring pipeline. Only the copy —
/// title, rationale, caption, reel script, carousel slides, hashtags and CTA —
/// comes from the model, so live generation can never distort the ranking.
///
/// When the model returns nothing usable (mock provider active, or an
/// unparsable payload) the scored suggestions are returned unchanged rather
/// than being replaced with invented text.
/// </summary>
public sealed class CampaignAiProvider : ICampaignAiProvider
{
    private readonly IPromptBuilder _promptBuilder;
    private readonly IAiOrchestrator _orchestrator;
    private readonly ILogger<CampaignAiProvider> _logger;

    /// <summary>Telemetry label for prompts issued by this provider.</summary>
    private const string ModuleName = "campaigns";

    /// <summary>
    /// Instruction pinning the model to a copy-only contract keyed by product
    /// id, so the response can be merged onto the scored suggestions without
    /// letting the model restate any of the computed numbers.
    /// </summary>
    private const string SystemInstruction =
        "You write marketing copy for Vrindaya, an Indian handmade ethnic apparel brand. " +
        "Reply with JSON only — no markdown, no commentary. " +
        "Use this exact shape: {\"items\":[{\"productId\":string,\"title\":string,\"rationale\":string," +
        "\"instagramCaption\":string,\"reelScript\":string,\"carouselSlides\":[string]," +
        "\"hashtags\":[string],\"cta\":string}]}. " +
        "Return one item per product id given in the brief, reusing that id exactly. " +
        "Do not invent products and do not include scores, ROI or revenue figures.";

    public CampaignAiProvider(
        IPromptBuilder promptBuilder,
        IAiOrchestrator orchestrator,
        ILogger<CampaignAiProvider> logger)
    {
        _promptBuilder = promptBuilder ?? throw new ArgumentNullException(nameof(promptBuilder));
        _orchestrator = orchestrator ?? throw new ArgumentNullException(nameof(orchestrator));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public async Task<CampaignResponseDto> GenerateAsync(
        CampaignRequestDto request,
        IReadOnlyList<CampaignSuggestionDto> suggestions,
        string? prompt = null,
        CancellationToken cancellationToken = default)
    {
        if (request is null)
            throw new ArgumentNullException(nameof(request));

        cancellationToken.ThrowIfCancellationRequested();

        var scored = suggestions ?? Array.Empty<CampaignSuggestionDto>();
        var totalProductsAnalyzed = scored.Count;

        var campaigns = scored
            .Select(s => Clone(s, request.PreferredObjective))
            .OrderByDescending(c => c.Score)
            .ToList();

        var maxCampaigns = request.MaximumCampaigns > 0
            ? Math.Min(request.MaximumCampaigns, campaigns.Count)
            : campaigns.Count;

        campaigns = campaigns.Take(maxCampaigns).ToList();

        if (campaigns.Count > 0)
        {
            var brief = string.IsNullOrWhiteSpace(prompt)
                ? _promptBuilder.Build(request, campaigns)
                : prompt!;

            var copy = await _orchestrator.GenerateJsonAsync<CampaignCopyEnvelope>(
                brief, SystemInstruction, ModuleName, cancellationToken);

            ApplyCopy(campaigns, copy);
        }

        _logger.LogInformation(
            "CampaignAiProvider produced {TotalCampaigns} suggestions from {TotalProducts} candidates via {Provider}.",
            campaigns.Count,
            totalProductsAnalyzed,
            _orchestrator.ActiveProviderName);

        return new CampaignResponseDto
        {
            Campaigns = campaigns,
            GeneratedAt = DateTime.UtcNow,
            TotalProductsAnalyzed = totalProductsAnalyzed,
            TotalCampaigns = campaigns.Count,
        };
    }

    /// <summary>
    /// Copies a scored suggestion, preserving every computed value and
    /// normalizing only the objective and the derived priority band.
    /// </summary>
    private static CampaignSuggestionDto Clone(CampaignSuggestionDto source, CampaignObjective objective) =>
        new()
        {
            ProductId = source.ProductId,
            ProductName = source.ProductName,
            Category = source.Category,
            Title = source.Title,
            Objective = objective,
            Rationale = source.Rationale,
            Score = source.Score,
            Priority = ResolvePriority(source.Score),
            Confidence = Math.Round(source.Confidence, 2),
            ExpectedRoi = Math.Round(source.ExpectedRoi, 2),
            EstimatedRevenue = source.EstimatedRevenue,
            InstagramCaption = source.InstagramCaption,
            ReelScript = source.ReelScript,
            CarouselSlides = source.CarouselSlides,
            Hashtags = source.Hashtags,
            Cta = source.Cta,
        };

    /// <summary>Deterministic score-to-priority banding.</summary>
    private static CampaignPriority ResolvePriority(int score) => score switch
    {
        >= 80 => CampaignPriority.Critical,
        >= 60 => CampaignPriority.High,
        >= 40 => CampaignPriority.Medium,
        _ => CampaignPriority.Low,
    };

    /// <summary>
    /// Merges model copy onto the scored suggestions by product id. Items the
    /// model omitted, or fields it left blank, keep their engine-derived value —
    /// a partial answer degrades a campaign's copy, never its ranking.
    /// </summary>
    private void ApplyCopy(List<CampaignSuggestionDto> campaigns, CampaignCopyEnvelope? envelope)
    {
        if (envelope?.Items is not { Count: > 0 })
        {
            _logger.LogInformation(
                "CampaignAiProvider: no model copy available — returning scored suggestions unchanged.");

            return;
        }

        var byId = envelope.Items
            .Where(i => !string.IsNullOrWhiteSpace(i.ProductId))
            .GroupBy(i => i.ProductId!, StringComparer.OrdinalIgnoreCase)
            .ToDictionary(g => g.Key, g => g.First(), StringComparer.OrdinalIgnoreCase);

        var applied = 0;

        foreach (var campaign in campaigns)
        {
            if (!byId.TryGetValue(campaign.ProductId, out var item))
            {
                continue;
            }

            campaign.Title = Prefer(item.Title, campaign.Title);
            campaign.Rationale = Prefer(item.Rationale, campaign.Rationale);
            campaign.InstagramCaption = Prefer(item.InstagramCaption, campaign.InstagramCaption);
            campaign.ReelScript = Prefer(item.ReelScript, campaign.ReelScript);
            campaign.Cta = Prefer(item.Cta, campaign.Cta);

            if (item.CarouselSlides is { Count: > 0 })
                campaign.CarouselSlides = item.CarouselSlides;

            if (item.Hashtags is { Count: > 0 })
                campaign.Hashtags = item.Hashtags;

            applied++;
        }

        _logger.LogInformation(
            "CampaignAiProvider applied model copy to {Applied}/{Total} campaigns.",
            applied,
            campaigns.Count);
    }

    private static string Prefer(string? candidate, string fallback) =>
        string.IsNullOrWhiteSpace(candidate) ? fallback : candidate!.Trim();

    /// <summary>Copy-only contract the model is asked to return.</summary>
    private sealed class CampaignCopyEnvelope
    {
        public List<CampaignCopyItem>? Items { get; set; }
    }

    /// <summary>Per-product copy returned by the model.</summary>
    private sealed class CampaignCopyItem
    {
        public string? ProductId { get; set; }

        public string? Title { get; set; }

        public string? Rationale { get; set; }

        public string? InstagramCaption { get; set; }

        public string? ReelScript { get; set; }

        public List<string>? CarouselSlides { get; set; }

        public List<string>? Hashtags { get; set; }

        public string? Cta { get; set; }
    }
}
