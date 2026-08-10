using Vrindaya.Api.AI.Dashboard.DTOs;
using Vrindaya.Api.AI.Flipkart.DTOs;
using Vrindaya.Api.AI.Flipkart.Interfaces;
using Vrindaya.Api.AI.Flipkart.Models;
using Vrindaya.Api.AI.Suggestions.DTOs;
using Vrindaya.Api.AI.Suggestions.Interfaces;
using Vrindaya.Api.AI.Suggestions.Models;

namespace Vrindaya.Api.AI.Suggestions.Services;

using static Vrindaya.Api.AI.Flipkart.Engines.InventoryRecommendationConstants;

/// <summary>
/// Default <see cref="IAiSuggestionService"/>. Runs each product through the
/// existing engines — <see cref="IProductIntelligenceEngine"/>,
/// <see cref="IInventoryRecommendationEngine"/>,
/// <see cref="IListingQualityEngine"/>,
/// <see cref="IPricingRecommendationEngine"/> and
/// <see cref="ICampaignSuggestionEngine"/> — and applies deterministic business
/// rules over their results to emit suggestions. Every threshold reuses the
/// engines' own published constants, so the rules can never drift from the
/// scores they read. No AI provider, no Firestore, no randomness.
/// </summary>
public sealed class AiSuggestionService : IAiSuggestionService
{
    /// <summary>Listing score at or below which a quality suggestion is raised.</summary>
    private const int PoorListingScore = 60;

    /// <summary>Listing score treated as critically bad.</summary>
    private const int CriticalListingScore = 40;

    /// <summary>Product intelligence score at or above which a product is promotable.</summary>
    private const int PromotableProductScore = 70;

    /// <summary>Campaign suitability score at or above which a campaign is worth running.</summary>
    private const int WorthwhileCampaignScore = 60;

    /// <summary>Minimum gap between current and suggested price, as a share of the current price, before a pricing suggestion fires.</summary>
    private const double PricingGapThreshold = 0.10;

    private readonly IProductIntelligenceEngine _productIntelligence;
    private readonly IInventoryRecommendationEngine _inventory;
    private readonly IListingQualityEngine _listingQuality;
    private readonly IPricingRecommendationEngine _pricing;
    private readonly ICampaignSuggestionEngine _campaigns;
    private readonly ILogger<AiSuggestionService> _logger;

    public AiSuggestionService(
        IProductIntelligenceEngine productIntelligence,
        IInventoryRecommendationEngine inventory,
        IListingQualityEngine listingQuality,
        IPricingRecommendationEngine pricing,
        ICampaignSuggestionEngine campaigns,
        ILogger<AiSuggestionService> logger)
    {
        _productIntelligence = productIntelligence ?? throw new ArgumentNullException(nameof(productIntelligence));
        _inventory = inventory ?? throw new ArgumentNullException(nameof(inventory));
        _listingQuality = listingQuality ?? throw new ArgumentNullException(nameof(listingQuality));
        _pricing = pricing ?? throw new ArgumentNullException(nameof(pricing));
        _campaigns = campaigns ?? throw new ArgumentNullException(nameof(campaigns));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public Task<AiSuggestionCollectionDto> GenerateAsync(
        DashboardInsightsRequestDto request,
        CancellationToken cancellationToken = default)
    {
        if (request is null)
            throw new ArgumentNullException(nameof(request));

        cancellationToken.ThrowIfCancellationRequested();

        var products = request.Products ?? [];
        var listings = request.Listings ?? [];
        var suggestions = new List<AiSuggestionDto>();

        foreach (var product in products)
        {
            var intelligence = _productIntelligence.Analyze(product);
            var inventory = _inventory.Recommend(product);
            var pricing = _pricing.Recommend(product);
            listings.TryGetValue(product.ProductId, out var listing);

            AddIfPresent(suggestions, BuildLowStockSuggestion(product, inventory));
            AddIfPresent(suggestions, BuildOverstockSuggestion(product, inventory));
            AddIfPresent(suggestions, BuildMarginSuggestion(product, intelligence));
            AddIfPresent(suggestions, BuildPricingSuggestion(product, pricing));

            if (listing is not null)
            {
                AddIfPresent(suggestions, BuildListingSuggestion(product, _listingQuality.Evaluate(listing)));
                AddIfPresent(suggestions, BuildCampaignSuggestion(product, _campaigns.Suggest(product, listing)));
            }
        }

        var ordered = suggestions
            .OrderBy(s => s.Severity)
            .ThenByDescending(s => s.Impact)
            .Take(Math.Max(1, request.MaximumPerSection) * Enum.GetValues<SuggestionCategory>().Length)
            .ToList();

        var collection = new AiSuggestionCollectionDto
        {
            Suggestions = ordered,
            TotalSuggestions = ordered.Count,
            TotalProductsAnalyzed = products.Count,
            CountByCategory = ordered.GroupBy(s => s.Type).ToDictionary(g => g.Key, g => g.Count()),
            CountBySeverity = ordered.GroupBy(s => s.Severity).ToDictionary(g => g.Key, g => g.Count()),
            GeneratedAt = DateTime.UtcNow,
        };

        _logger.LogInformation(
            "AiSuggestionService: {SuggestionCount} suggestions from {ProductCount} products.",
            collection.TotalSuggestions, collection.TotalProductsAnalyzed);

        return Task.FromResult(collection);
    }

    // -------------------------------------------------------------------
    // Rule: low stock alerts
    // -------------------------------------------------------------------

    private static AiSuggestionDto? BuildLowStockSuggestion(
        FlipkartProduct product,
        InventoryRecommendationResultDto inventory)
    {
        if (inventory.StockHealth is not (StockHealth.OutOfStock or StockHealth.Low))
            return null;

        var severity = inventory.StockHealth == StockHealth.OutOfStock || product.Stock <= CriticalLowStock
            ? SuggestionSeverity.Critical
            : SuggestionSeverity.High;

        return new AiSuggestionDto
        {
            ProductId = product.ProductId,
            ProductName = product.Name,
            Category = product.Category,
            Type = SuggestionCategory.LowStock,
            Severity = severity,
            Title = inventory.StockHealth == StockHealth.OutOfStock
                ? $"{product.Name} is out of stock"
                : $"{product.Name} is running low ({product.Stock} units)",
            Rationale = inventory.Rationale,
            RecommendedAction = inventory.RestockQuantity is > 0
                ? $"Restock {inventory.RestockQuantity} units."
                : "Reorder stock before the listing goes unavailable.",
            Impact = ImpactFrom(severity),
            Metrics =
            {
                ["Stock"] = product.Stock.ToString(),
                ["SalesVelocity"] = inventory.SalesVelocity.ToString("F2"),
                ["DaysOfInventory"] = inventory.DaysOfInventory?.ToString("F1") ?? "n/a",
            },
        };
    }

    // -------------------------------------------------------------------
    // Rule: overstock / clearance
    // -------------------------------------------------------------------

    private static AiSuggestionDto? BuildOverstockSuggestion(
        FlipkartProduct product,
        InventoryRecommendationResultDto inventory)
    {
        if (inventory.Action is not (RecommendedAction.Liquidate or RecommendedAction.Discount))
            return null;

        var severity = inventory.Action == RecommendedAction.Liquidate
            ? SuggestionSeverity.High
            : SuggestionSeverity.Medium;

        return new AiSuggestionDto
        {
            ProductId = product.ProductId,
            ProductName = product.Name,
            Category = product.Category,
            Type = SuggestionCategory.Overstock,
            Severity = severity,
            Title = $"{product.Name} is moving slowly at {product.Stock} units",
            Rationale = inventory.Rationale,
            RecommendedAction = inventory.DiscountPercent is > 0
                ? $"Run a {inventory.DiscountPercent:F0}% clearance to accelerate sell-through."
                : "Clear the excess stock before it ages further.",
            Impact = ImpactFrom(severity),
            Metrics =
            {
                ["Stock"] = product.Stock.ToString(),
                ["InventoryAgeDays"] = inventory.InventoryAgeDays.ToString(),
                ["SalesVelocity"] = inventory.SalesVelocity.ToString("F2"),
            },
        };
    }

    // -------------------------------------------------------------------
    // Rule: high margin opportunities
    // -------------------------------------------------------------------

    private static AiSuggestionDto? BuildMarginSuggestion(
        FlipkartProduct product,
        ProductIntelligenceResultDto intelligence)
    {
        var isHighMargin = intelligence.MarginPercentage >= HighMarginRatio * 100d;
        var isPromotable = intelligence.OverallProductScore >= PromotableProductScore;
        var hasStock = intelligence.StockHealth is StockHealth.Healthy or StockHealth.Overstock;

        if (!isHighMargin || !isPromotable || !hasStock)
            return null;

        return new AiSuggestionDto
        {
            ProductId = product.ProductId,
            ProductName = product.Name,
            Category = product.Category,
            Type = SuggestionCategory.MarginOpportunity,
            Severity = SuggestionSeverity.Medium,
            Title = $"{product.Name} earns {intelligence.MarginPercentage:F0}% margin with stock on hand",
            Rationale =
                $"Product score {intelligence.OverallProductScore}/100 with {intelligence.MarginPercentage:F1}% margin " +
                $"and {intelligence.StockHealth} stock.",
            RecommendedAction = "Increase promotion spend while margin and stock both support it.",
            Impact = intelligence.OverallProductScore,
            Metrics =
            {
                ["MarginPercentage"] = intelligence.MarginPercentage.ToString("F1"),
                ["ProfitPerUnit"] = intelligence.ProfitMargin.ToString("F2"),
                ["ProductScore"] = intelligence.OverallProductScore.ToString(),
            },
        };
    }

    // -------------------------------------------------------------------
    // Rule: poor listing quality
    // -------------------------------------------------------------------

    private static AiSuggestionDto? BuildListingSuggestion(
        FlipkartProduct product,
        ListingQualityResultDto quality)
    {
        if (quality.OverallScore > PoorListingScore)
            return null;

        var severity = quality.OverallScore <= CriticalListingScore
            ? SuggestionSeverity.High
            : SuggestionSeverity.Medium;

        var topSuggestion = quality.Suggestions
            .OrderByDescending(s => s.Severity)
            .FirstOrDefault();

        return new AiSuggestionDto
        {
            ProductId = product.ProductId,
            ProductName = product.Name,
            Category = product.Category,
            Type = SuggestionCategory.ListingQuality,
            Severity = severity,
            Title = $"{product.Name} listing scores {quality.OverallScore}/100",
            Rationale = topSuggestion?.Message ?? "Listing quality is below the marketplace standard.",
            RecommendedAction = topSuggestion is null
                ? "Improve the listing's weakest dimensions."
                : $"Fix {topSuggestion.Category} first.",
            Impact = 100 - quality.OverallScore,
            Metrics =
            {
                ["OverallScore"] = quality.OverallScore.ToString(),
                ["TitleScore"] = quality.TitleScore.ToString(),
                ["DescriptionScore"] = quality.DescriptionScore.ToString(),
                ["ImageCountScore"] = quality.ImageCountScore.ToString(),
                ["SeoKeywordsScore"] = quality.SeoKeywordsScore.ToString(),
            },
        };
    }

    // -------------------------------------------------------------------
    // Rule: campaign suggestions
    // -------------------------------------------------------------------

    private static AiSuggestionDto? BuildCampaignSuggestion(
        FlipkartProduct product,
        CampaignSuggestionResultDto campaign)
    {
        if (campaign.Score < WorthwhileCampaignScore)
            return null;

        return new AiSuggestionDto
        {
            ProductId = product.ProductId,
            ProductName = product.Name,
            Category = product.Category,
            Type = SuggestionCategory.Campaign,
            Severity = MapCampaignSeverity(campaign.Priority),
            Title = $"Run a {campaign.Objective} campaign for {product.Name}",
            Rationale = campaign.Rationale,
            RecommendedAction = campaign.DiscountPercent is > 0
                ? $"Launch at ₹{campaign.CampaignPrice:F0} ({campaign.DiscountPercent:F0}% off)."
                : $"Launch at ₹{campaign.CampaignPrice:F0}.",
            Impact = campaign.Score,
            Metrics =
            {
                ["CampaignScore"] = campaign.Score.ToString(),
                ["ExpectedRoi"] = campaign.ExpectedRoi.ToString("F2"),
                ["EstimatedRevenue"] = campaign.EstimatedRevenue.ToString(),
            },
        };
    }

    // -------------------------------------------------------------------
    // Rule: pricing improvements
    // -------------------------------------------------------------------

    private static AiSuggestionDto? BuildPricingSuggestion(
        FlipkartProduct product,
        PricingRecommendationResultDto pricing)
    {
        if (pricing.CurrentSellingPrice <= 0 || pricing.SuggestedSellingPrice <= 0)
            return null;

        var delta = pricing.SuggestedSellingPrice - pricing.CurrentSellingPrice;
        var gap = Math.Abs(delta) / pricing.CurrentSellingPrice;

        if (gap < PricingGapThreshold)
            return null;

        var belowSafeFloor = pricing.CurrentSellingPrice < pricing.MinimumSafePrice;
        var severity = belowSafeFloor ? SuggestionSeverity.Critical : SuggestionSeverity.Medium;

        return new AiSuggestionDto
        {
            ProductId = product.ProductId,
            ProductName = product.Name,
            Category = product.Category,
            Type = SuggestionCategory.Pricing,
            Severity = severity,
            Title = belowSafeFloor
                ? $"{product.Name} is priced below its safe floor"
                : $"{product.Name} price is {gap * 100:F0}% away from the suggested price",
            Rationale =
                $"Current ₹{pricing.CurrentSellingPrice:F0} at {pricing.CurrentMarginPercentage:F1}% margin " +
                $"versus a competitive {pricing.CompetitiveMarginPercentage:F1}%.",
            RecommendedAction = delta > 0
                ? $"Raise the price to ₹{pricing.SuggestedSellingPrice:F0}."
                : $"Lower the price to ₹{pricing.SuggestedSellingPrice:F0}.",
            Impact = ImpactFrom(severity),
            Metrics =
            {
                ["CurrentPrice"] = pricing.CurrentSellingPrice.ToString("F0"),
                ["SuggestedPrice"] = pricing.SuggestedSellingPrice.ToString("F0"),
                ["MinimumSafePrice"] = pricing.MinimumSafePrice.ToString("F0"),
                ["CurrentMarginPercentage"] = pricing.CurrentMarginPercentage.ToString("F1"),
            },
        };
    }

    // -------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------

    private static void AddIfPresent(List<AiSuggestionDto> target, AiSuggestionDto? suggestion)
    {
        if (suggestion is not null)
            target.Add(suggestion);
    }

    private static SuggestionSeverity MapCampaignSeverity(CampaignSuggestionPriority priority) =>
        priority switch
        {
            CampaignSuggestionPriority.Critical => SuggestionSeverity.Critical,
            CampaignSuggestionPriority.High => SuggestionSeverity.High,
            CampaignSuggestionPriority.Medium => SuggestionSeverity.Medium,
            _ => SuggestionSeverity.Low,
        };

    private static int ImpactFrom(SuggestionSeverity severity) =>
        severity switch
        {
            SuggestionSeverity.Critical => 100,
            SuggestionSeverity.High => 80,
            SuggestionSeverity.Medium => 55,
            _ => 30,
        };
}
