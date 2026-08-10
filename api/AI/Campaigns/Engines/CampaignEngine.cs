using Vrindaya.Api.AI.Campaigns.Dtos;
using Vrindaya.Api.AI.Campaigns.Interfaces;
using Vrindaya.Api.AI.Campaigns.Models;
using Vrindaya.Api.AI.Campaigns.Scoring;

namespace Vrindaya.Api.AI.Campaigns.Engines;

using static Vrindaya.Api.AI.Campaigns.Scoring.CampaignScoringConstants;

/// <summary>
/// Default <see cref="ICampaignEngine"/>. Filters the product pool according
/// to the request, scores each candidate with the <see cref="ICampaignScoringEngine"/>,
/// and emits <see cref="CampaignSuggestionDto"/> results ordered by score
/// (descending). Fully deterministic — no randomness, no wall-clock dependence
/// beyond the product's own dates.
/// </summary>
public sealed class CampaignEngine : ICampaignEngine
{
    private readonly ICampaignScoringEngine _scoringEngine;

    // ---- Priority thresholds (score → CampaignPriority) ----
    private const int CriticalPriorityThreshold = 80;
    private const int HighPriorityThreshold = 60;
    private const int MediumPriorityThreshold = 40;

    // ---- ROI estimation ----
    private const double RoiBase = 1.0;
    private const double RoiMarginMultiplier = 5.0;
    private const double RoiScoreMultiplier = 2.0;

    // ---- Festival → category keyword mapping for seasonality ----
    private static readonly string[] FestiveCategoryKeywords =
    {
        "ethnic", "saree", "lehenga", "suit", "jewelry", "apparel",
    };

    public CampaignEngine(ICampaignScoringEngine scoringEngine)
    {
        _scoringEngine = scoringEngine;
    }

    public CampaignResponseDto Generate(CampaignRequestDto request, IReadOnlyList<CampaignProduct> products)
    {
        var filtered = FilterProducts(products, request);

        var suggestions = new List<CampaignSuggestionDto>(filtered.Count);

        foreach (var product in filtered)
        {
            var seasonality = CalculateSeasonality(request.FestivalName, product.Category);
            var score = _scoringEngine.Score(product, seasonality);

            suggestions.Add(new CampaignSuggestionDto
            {
                ProductId = product.ProductId,
                ProductName = product.Name,
                Category = product.Category,
                Title = GenerateTitle(request.PreferredObjective, product.Name),
                Objective = request.PreferredObjective,
                Rationale = GenerateRationale(product, score, seasonality, request.FestivalName),
                Score = score,
                Priority = DeterminePriority(score),
                Confidence = ScoreToConfidence(score),
                ExpectedRoi = CalculateExpectedRoi(product, score),
                EstimatedRevenue = CalculateEstimatedRevenue(product, score),
            });
        }

        suggestions.Sort((a, b) => b.Score.CompareTo(a.Score));

        var maxCampaigns = Math.Min(request.MaximumCampaigns, suggestions.Count);
        var topSuggestions = suggestions.Take(maxCampaigns).ToList();

        return new CampaignResponseDto
        {
            Campaigns = topSuggestions,
            GeneratedAt = DateTime.UtcNow,
            TotalProductsAnalyzed = products.Count,
            TotalCampaigns = topSuggestions.Count,
        };
    }

    // -------------------------------------------------------------------
    // Filtering
    // -------------------------------------------------------------------

    private static IReadOnlyList<CampaignProduct> FilterProducts(
        IReadOnlyList<CampaignProduct> products,
        CampaignRequestDto request)
    {
        var query = products.AsEnumerable();

        if (request.ProductIds?.Count > 0)
            query = query.Where(p => request.ProductIds.Contains(p.ProductId));

        if (!request.IncludeLowStock)
            query = query.Where(p => p.Stock > LowStockLevel);

        if (!request.IncludeNewProducts)
            query = query.Where(p => DaysSinceCreated(p) > LaunchAgeDays);

        if (!request.IncludeBestSellers)
            query = query.Where(p => UnitsPerDay(p) < HighVelocityUnitsPerDay);

        return query.ToList();
    }

    // -------------------------------------------------------------------
    // Seasonality
    // -------------------------------------------------------------------

    private static int CalculateSeasonality(string festivalName, string category)
    {
        if (string.IsNullOrWhiteSpace(festivalName))
            return NoSeasonalityScore;

        var lowerCategory = category.ToLowerInvariant();

        return FestiveCategoryKeywords.Any(k => lowerCategory.Contains(k))
            ? FullSeasonalityScore
            : NoSeasonalityScore;
    }

    // -------------------------------------------------------------------
    // Suggestion field derivation
    // -------------------------------------------------------------------

    private static CampaignPriority DeterminePriority(int score) =>
        score >= CriticalPriorityThreshold ? CampaignPriority.Critical
        : score >= HighPriorityThreshold ? CampaignPriority.High
        : score >= MediumPriorityThreshold ? CampaignPriority.Medium
        : CampaignPriority.Low;

    private static double ScoreToConfidence(int score) =>
        score / (double)MaxScore;

    private static double CalculateExpectedRoi(CampaignProduct product, int score)
    {
        var marginRatio = MarginRatio(product);
        return RoiBase + (marginRatio * RoiMarginMultiplier) + (score / (double)MaxScore * RoiScoreMultiplier);
    }

    private static long CalculateEstimatedRevenue(CampaignProduct product, int score)
    {
        return (long)(product.SellingPrice * product.Stock * score / (double)MaxScore);
    }

    private static string GenerateTitle(CampaignObjective objective, string productName) =>
        objective switch
        {
            CampaignObjective.IncreaseSales => $"Boost Sales: {productName}",
            CampaignObjective.IncreaseFollowers => $"Grow Audience: {productName}",
            CampaignObjective.ClearInventory => $"Clear Stock: {productName}",
            CampaignObjective.LaunchProduct => $"New Launch: {productName}",
            CampaignObjective.FestivalPromotion => $"Festival Special: {productName}",
            CampaignObjective.WebsiteTraffic => $"Drive Traffic: {productName}",
            CampaignObjective.BrandAwareness => $"Brand Boost: {productName}",
            CampaignObjective.RepeatCustomers => $"Win Back: {productName}",
            CampaignObjective.Upsell => $"Upgrade Offer: {productName}",
            CampaignObjective.CrossSell => $"Complete the Look: {productName}",
            _ => $"Campaign: {productName}",
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

        var rationale = $"Score {score}/{MaxScore}. "
            + $"Margin {marginPct:F0}%, {product.Stock} units in stock, "
            + $"{velocity:F1} units/day velocity, {age} days old.";

        if (!string.IsNullOrWhiteSpace(festivalName))
            rationale += $" Festival relevance: {seasonality}/{MaxScore} for {festivalName}.";

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
