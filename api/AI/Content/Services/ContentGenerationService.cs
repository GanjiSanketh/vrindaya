using Microsoft.Extensions.Logging;
using Vrindaya.Api.AI.Campaigns.Models;
using Vrindaya.Api.AI.Content.DTOs;
using Vrindaya.Api.AI.Content.Interfaces;
using Vrindaya.Api.AI.ContentGeneration.DTOs;
using Vrindaya.Api.AI.ContentGeneration.Models;
using Vrindaya.Api.AI.Orchestrator.Interfaces;
using Vrindaya.Api.AI.Orchestrator.Models;

namespace Vrindaya.Api.AI.Content.Services;

using static Vrindaya.Api.AI.Campaigns.Scoring.CampaignScoringConstants;

/// <summary>
/// Default <see cref="IContentGenerationService"/>. Accepts a
/// <see cref="ContentGenerationRequest"/>, adapts it to the internal content
/// generation contract, routes the request through the hub-and-spoke AI
/// orchestrator (the "content" route, executed by the mock provider pipeline),
/// and maps the top-scored piece back to a <see cref="ContentGenerationResponse"/>.
/// </summary>
public sealed class ContentGenerationService : IContentGenerationService
{
    /// <summary>Number of internal candidates requested from the pipeline before the top piece is selected.</summary>
    private const int InternalCandidateCount = 5;

    private readonly IAiOrchestrator _orchestrator;
    private readonly ILogger<ContentGenerationService> _logger;

    public ContentGenerationService(
        IAiOrchestrator orchestrator,
        ILogger<ContentGenerationService> logger)
    {
        _orchestrator = orchestrator ?? throw new ArgumentNullException(nameof(orchestrator));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public async Task<ContentGenerationResponse> GenerateAsync(
        ContentGenerationRequest request,
        CancellationToken cancellationToken = default)
    {
        if (request is null)
            throw new ArgumentNullException(nameof(request));

        _logger.LogInformation(
            "Content generation (API) starting — routing objective {Objective} through the AI orchestrator.",
            request.CampaignObjective);

        var orchestrationRequest = new AiOrchestratorRequest
        {
            Route = AiRouteCatalog.ContentGenerationRoute,
            Content = ToInternalRequest(request),
        };

        var orchestration = await _orchestrator.ExecuteAsync(orchestrationRequest, cancellationToken);

        _logger.LogInformation(
            "Content generation (API) completed via orchestrator — {Status} in {DurationMs}ms.",
            orchestration.Status, orchestration.DurationMs);

        return ToResponse(orchestration.Result as ContentGenerationResponseDto);
    }

    // -------------------------------------------------------------------
    // Request adaptation
    // -------------------------------------------------------------------

    private static ContentGenerationRequestDto ToInternalRequest(ContentGenerationRequest request)
    {
        return new ContentGenerationRequestDto
        {
            Products = request.Products ?? new List<CampaignProduct>(),
            ContentType = DefaultFormatFor(request.CampaignObjective),
            Platform = request.Platform,
            Tone = request.Tone,
            MaximumPieces = InternalCandidateCount,
            TargetAudience = string.IsNullOrWhiteSpace(request.TargetAudience) ? "General" : request.TargetAudience,
            FestivalName = request.Festival ?? string.Empty,
        };
    }

    private static ContentType DefaultFormatFor(CampaignObjective objective) =>
        objective switch
        {
            CampaignObjective.LaunchProduct => ContentType.Reel,
            CampaignObjective.FestivalPromotion => ContentType.Carousel,
            CampaignObjective.IncreaseFollowers => ContentType.Story,
            CampaignObjective.BrandAwareness => ContentType.Blog,
            _ => ContentType.Post,
        };

    // -------------------------------------------------------------------
    // Response mapping
    // -------------------------------------------------------------------

    private static ContentGenerationResponse ToResponse(ContentGenerationResponseDto? internalResponse)
    {
        var piece = internalResponse?.Pieces?.FirstOrDefault();

        if (piece is null)
            return new ContentGenerationResponse();

        return new ContentGenerationResponse
        {
            Title = piece.Title,
            Caption = piece.Caption,
            Hashtags = piece.Hashtags,
            CallToAction = piece.Cta,
            ImagePrompt = piece.ImagePrompt,
            ReelScript = piece.ReelScript,
            CarouselSlides = piece.CarouselSlides,
            EstimatedEngagement = EstimateEngagement(piece.Score),
        };
    }

    private static double EstimateEngagement(int score) =>
        Math.Round(1.0 + score / (double)MaxScore * 6.0, 1);
}