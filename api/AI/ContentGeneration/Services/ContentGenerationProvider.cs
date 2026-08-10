using Microsoft.Extensions.Logging;
using Vrindaya.Api.AI.ContentGeneration.DTOs;
using Vrindaya.Api.AI.ContentGeneration.Interfaces;
using Vrindaya.Api.AI.ContentGeneration.Models;
using Vrindaya.Api.AI.ContentGeneration.Prompts;
using Vrindaya.Api.AI.Core.Interfaces;

namespace Vrindaya.Api.AI.ContentGeneration.Services;

/// <summary>
/// Default <see cref="IContentGenerationProvider"/>. Builds a content brief
/// from the scored pieces with <see cref="IContentPromptBuilder"/>, routes it
/// through the core <see cref="IAiOrchestrator"/> and merges the model's copy
/// back onto those pieces.
///
/// The content engine keeps ownership of every computed field — score,
/// priority, confidence, audience and the product identity. The model supplies
/// only the copy: hook, caption, script, CTA, carousel slides, hashtags,
/// engagement tips, SEO keywords, image prompt and posting hints. A piece the
/// model omits keeps its engine-derived values instead of being replaced with
/// invented text.
/// </summary>
public sealed class ContentGenerationProvider : IContentGenerationProvider
{
    private readonly IContentPromptBuilder _promptBuilder;
    private readonly IAiOrchestrator _orchestrator;
    private readonly ILogger<ContentGenerationProvider> _logger;

    /// <summary>Telemetry label for prompts issued by this provider.</summary>
    private const string ModuleName = "content";

    /// <summary>
    /// Instruction pinning the model to a copy-only contract keyed by product
    /// id, so the answer merges onto the scored pieces without restating any
    /// computed value.
    /// </summary>
    private const string SystemInstruction =
        "You write social and email marketing copy for Vrindaya, an Indian handmade ethnic apparel brand. " +
        "Reply with JSON only — no markdown, no commentary. " +
        "Use this exact shape: {\"pieces\":[{\"productId\":string,\"hook\":string,\"caption\":string," +
        "\"reelScript\":string,\"cta\":string,\"suggestedMusic\":string,\"bestPostingTime\":string," +
        "\"imagePrompt\":string,\"imageNegativePrompt\":string,\"carouselSlides\":[string]," +
        "\"hashtags\":[string],\"engagementTips\":[string],\"seoKeywords\":[string]}]}. " +
        "Return one piece per product id given in the brief, reusing that id exactly. " +
        "Do not invent products and do not include scores or priorities.";

    public ContentGenerationProvider(
        IContentPromptBuilder promptBuilder,
        IAiOrchestrator orchestrator,
        ILogger<ContentGenerationProvider> logger)
    {
        _promptBuilder = promptBuilder ?? throw new ArgumentNullException(nameof(promptBuilder));
        _orchestrator = orchestrator ?? throw new ArgumentNullException(nameof(orchestrator));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public async Task<ContentGenerationResponseDto> GenerateAsync(
        ContentGenerationRequestDto request,
        IReadOnlyList<ContentPieceDto> pieces,
        CancellationToken cancellationToken = default)
    {
        if (request is null)
            throw new ArgumentNullException(nameof(request));

        cancellationToken.ThrowIfCancellationRequested();

        var scored = pieces ?? Array.Empty<ContentPieceDto>();

        var enriched = scored
            .Select(p => Clone(p, request))
            .OrderByDescending(p => p.Score)
            .ToList();

        if (enriched.Count > 0)
        {
            var brief = _promptBuilder.Build(request, enriched);

            var copy = await _orchestrator.GenerateJsonAsync<ContentCopyEnvelope>(
                brief, SystemInstruction, ModuleName, cancellationToken);

            ApplyCopy(enriched, copy);
        }

        _logger.LogInformation(
            "ContentGenerationProvider produced {TotalPieces} content pieces for format {Format} via {Provider}.",
            enriched.Count,
            request.ContentType,
            _orchestrator.ActiveProviderName);

        return new ContentGenerationResponseDto
        {
            Pieces = enriched,
            GeneratedAt = DateTime.UtcNow,
            TotalProductsAnalyzed = scored.Count,
            TotalPieces = enriched.Count,
        };
    }

    /// <summary>
    /// Copies a scored piece, preserving every engine-computed field and
    /// applying only the request-level format defaults.
    /// </summary>
    private static ContentPieceDto Clone(ContentPieceDto source, ContentGenerationRequestDto request) =>
        new()
        {
            ProductId = source.ProductId,
            ProductName = source.ProductName,
            Category = source.Category,
            ContentType = source.ContentType,
            Platform = source.Platform ?? request.Platform ?? DefaultPlatformFor(request.ContentType),
            Tone = request.Tone,
            Title = source.Title,
            Rationale = source.Rationale,
            Score = source.Score,
            Priority = source.Priority,
            Confidence = source.Confidence,
            TargetAudience = string.IsNullOrWhiteSpace(source.TargetAudience)
                ? (string.IsNullOrWhiteSpace(request.TargetAudience) ? "General" : request.TargetAudience)
                : source.TargetAudience,
            Hook = source.Hook,
            Caption = source.Caption,
            ReelScript = source.ReelScript,
            Cta = source.Cta,
            SuggestedMusic = source.SuggestedMusic,
            BestPostingTime = source.BestPostingTime,
            ImagePrompt = source.ImagePrompt,
            ImageNegativePrompt = source.ImageNegativePrompt,
            CarouselSlides = source.CarouselSlides,
            Hashtags = source.Hashtags,
            EngagementTips = source.EngagementTips,
            SeoKeywords = source.SeoKeywords,
        };

    /// <summary>Channel a format is published on when the request names none.</summary>
    private static ContentPlatform DefaultPlatformFor(ContentType contentType) => contentType switch
    {
        ContentType.Reel or ContentType.Story => ContentPlatform.Instagram,
        ContentType.Short => ContentPlatform.YouTube,
        ContentType.Email => ContentPlatform.Email,
        _ => ContentPlatform.Instagram,
    };

    /// <summary>
    /// Merges model copy onto the scored pieces by product id. Blank fields and
    /// omitted pieces keep their existing values, so a partial answer never
    /// blanks out content the engine already produced.
    /// </summary>
    private void ApplyCopy(List<ContentPieceDto> pieces, ContentCopyEnvelope? envelope)
    {
        if (envelope?.Pieces is not { Count: > 0 })
        {
            _logger.LogInformation(
                "ContentGenerationProvider: no model copy available — returning scored pieces unchanged.");

            return;
        }

        var byId = envelope.Pieces
            .Where(p => !string.IsNullOrWhiteSpace(p.ProductId))
            .GroupBy(p => p.ProductId!, StringComparer.OrdinalIgnoreCase)
            .ToDictionary(g => g.Key, g => g.First(), StringComparer.OrdinalIgnoreCase);

        var applied = 0;

        foreach (var piece in pieces)
        {
            if (!byId.TryGetValue(piece.ProductId, out var item))
            {
                continue;
            }

            piece.Hook = Prefer(item.Hook, piece.Hook);
            piece.Caption = Prefer(item.Caption, piece.Caption);
            piece.ReelScript = Prefer(item.ReelScript, piece.ReelScript);
            piece.Cta = Prefer(item.Cta, piece.Cta);
            piece.SuggestedMusic = Prefer(item.SuggestedMusic, piece.SuggestedMusic);
            piece.BestPostingTime = Prefer(item.BestPostingTime, piece.BestPostingTime);
            piece.ImagePrompt = Prefer(item.ImagePrompt, piece.ImagePrompt);
            piece.ImageNegativePrompt = Prefer(item.ImageNegativePrompt, piece.ImageNegativePrompt);

            if (item.CarouselSlides is { Count: > 0 })
                piece.CarouselSlides = item.CarouselSlides;

            if (item.Hashtags is { Count: > 0 })
                piece.Hashtags = item.Hashtags;

            if (item.EngagementTips is { Count: > 0 })
                piece.EngagementTips = item.EngagementTips;

            if (item.SeoKeywords is { Count: > 0 })
                piece.SeoKeywords = item.SeoKeywords;

            applied++;
        }

        _logger.LogInformation(
            "ContentGenerationProvider applied model copy to {Applied}/{Total} pieces.",
            applied,
            pieces.Count);
    }

    private static string Prefer(string? candidate, string fallback) =>
        string.IsNullOrWhiteSpace(candidate) ? fallback : candidate!.Trim();

    /// <summary>Copy-only contract the model is asked to return.</summary>
    private sealed class ContentCopyEnvelope
    {
        public List<ContentCopyItem>? Pieces { get; set; }
    }

    /// <summary>Per-product copy returned by the model.</summary>
    private sealed class ContentCopyItem
    {
        public string? ProductId { get; set; }

        public string? Hook { get; set; }

        public string? Caption { get; set; }

        public string? ReelScript { get; set; }

        public string? Cta { get; set; }

        public string? SuggestedMusic { get; set; }

        public string? BestPostingTime { get; set; }

        public string? ImagePrompt { get; set; }

        public string? ImageNegativePrompt { get; set; }

        public List<string>? CarouselSlides { get; set; }

        public List<string>? Hashtags { get; set; }

        public List<string>? EngagementTips { get; set; }

        public List<string>? SeoKeywords { get; set; }
    }
}
