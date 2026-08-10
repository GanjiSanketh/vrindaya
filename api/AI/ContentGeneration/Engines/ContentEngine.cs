using Vrindaya.Api.AI.Campaigns.Models;
using Vrindaya.Api.AI.Campaigns.Scoring;
using Vrindaya.Api.AI.ContentGeneration.DTOs;
using Vrindaya.Api.AI.ContentGeneration.Models;

namespace Vrindaya.Api.AI.ContentGeneration.Engines;

using static Vrindaya.Api.AI.ContentGeneration.Engines.ContentGenerationConstants;

/// <summary>
/// Default <see cref="IContentEngine"/>. Filters the product pool according to
/// the request, scores each candidate with the shared
/// <see cref="ICampaignScoringEngine"/>, and emits base <see cref="ContentPieceDto"/>
/// results ordered by score (descending). The provider later enriches these
/// base pieces with rich copy. Fully deterministic.
/// </summary>
public sealed class ContentEngine : IContentEngine
{
    private readonly ICampaignScoringEngine _scoringEngine;

    public ContentEngine(ICampaignScoringEngine scoringEngine)
    {
        _scoringEngine = scoringEngine ?? throw new ArgumentNullException(nameof(scoringEngine));
    }

    public ContentGenerationResponseDto Generate(ContentGenerationRequestDto request)
    {
        var filtered = FilterProducts(request);

        var pieces = new List<ContentPieceDto>(filtered.Count);

        foreach (var product in filtered)
        {
            var seasonality = CalculateSeasonality(request.FestivalName, product.Category);
            var score = _scoringEngine.Score(product, seasonality);

            pieces.Add(new ContentPieceDto
            {
                ProductId = product.ProductId,
                ProductName = product.Name,
                Category = product.Category,
                ContentType = request.ContentType,
                Platform = request.Platform,
                Tone = request.Tone,
                Title = DefaultTitle(request.ContentType, product.Name),
                Rationale = GenerateRationale(product, score, seasonality, request.FestivalName),
                Score = score,
                Priority = DeterminePriority(score),
                Confidence = Math.Round(score / (double)CampaignScoringConstants.MaxScore, 2),
                TargetAudience = string.IsNullOrWhiteSpace(request.TargetAudience) ? "General" : request.TargetAudience,
            });
        }

        pieces.Sort((a, b) => b.Score.CompareTo(a.Score));

        var maxPieces = Math.Min(request.MaximumPieces, pieces.Count);
        var topPieces = pieces.Take(maxPieces).ToList();

        return new ContentGenerationResponseDto
        {
            Pieces = topPieces,
            GeneratedAt = DateTime.UtcNow,
            TotalProductsAnalyzed = request.Products?.Count ?? filtered.Count,
            TotalPieces = topPieces.Count,
        };
    }

    // -------------------------------------------------------------------
    // Filtering
    // -------------------------------------------------------------------

    private static IReadOnlyList<CampaignProduct> FilterProducts(ContentGenerationRequestDto request)
    {
        var source = request.Products ?? Enumerable.Empty<CampaignProduct>();
        var query = source.AsEnumerable();

        if (request.ProductIds?.Count > 0)
            query = query.Where(p => request.ProductIds.Contains(p.ProductId));

        return query.ToList();
    }

    // -------------------------------------------------------------------
    // Seasonality
    // -------------------------------------------------------------------

    private static int CalculateSeasonality(string festivalName, string category)
    {
        if (string.IsNullOrWhiteSpace(festivalName))
            return CampaignScoringConstants.NoSeasonalityScore;

        var lowerCategory = category.ToLowerInvariant();

        return FestiveCategoryKeywords.Any(k => lowerCategory.Contains(k))
            ? CampaignScoringConstants.FullSeasonalityScore
            : CampaignScoringConstants.NoSeasonalityScore;
    }

    // -------------------------------------------------------------------
    // Piece field derivation
    // -------------------------------------------------------------------

    private static ContentPriority DeterminePriority(int score) =>
        score >= CriticalPriorityThreshold ? ContentPriority.Critical
        : score >= HighPriorityThreshold ? ContentPriority.High
        : score >= MediumPriorityThreshold ? ContentPriority.Medium
        : ContentPriority.Low;

    private static string DefaultTitle(ContentType contentType, string productName) =>
        contentType switch
        {
            ContentType.Post => $"Post: {productName}",
            ContentType.Reel => $"Reel: {productName}",
            ContentType.Carousel => $"Carousel: {productName}",
            ContentType.Story => $"Story: {productName}",
            ContentType.Short => $"Short: {productName}",
            ContentType.Graphic => $"Graphic: {productName}",
            ContentType.Email => $"Email: {productName}",
            ContentType.Blog => $"Blog: {productName}",
            _ => $"Content: {productName}",
        };

    private static string GenerateRationale(
        CampaignProduct product,
        int score,
        int seasonality,
        string festivalName)
    {
        var marginPct = MarginRatio(product) * 100.0;
        var velocity = UnitsPerDay(product);
        var age = DaysSinceCreated(product);

        var rationale = $"Score {score}/{CampaignScoringConstants.MaxScore}. "
            + $"Margin {marginPct:F0}%, {product.Stock} units in stock, "
            + $"{velocity:F1} units/day velocity, {age} days old.";

        if (!string.IsNullOrWhiteSpace(festivalName))
            rationale += $" Festival relevance: {seasonality}/{CampaignScoringConstants.MaxScore} for {festivalName}.";

        return rationale;
    }

    // -------------------------------------------------------------------
    // Shared helpers
    // -------------------------------------------------------------------

    private static double MarginRatio(CampaignProduct product) =>
        product.SellingPrice > 0
            ? (product.SellingPrice - product.PurchaseCost) / product.SellingPrice
            : 0.0;

    private static double UnitsPerDay(CampaignProduct product)
    {
        var ageDays = (DateTime.UtcNow - product.CreatedDate).TotalDays;
        return ageDays > 0 ? product.Sales / ageDays : 0.0;
    }

    private static int DaysSinceCreated(CampaignProduct product) =>
        (DateTime.UtcNow.Date - product.CreatedDate.Date).Days;
}