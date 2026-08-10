using Microsoft.Extensions.Logging;
using Vrindaya.Api.AI.Flipkart.DTOs;
using Vrindaya.Api.AI.Flipkart.Interfaces;
using Vrindaya.Api.AI.Flipkart.Models;

namespace Vrindaya.Api.AI.Flipkart.Engines;

/// <summary>
/// Default <see cref="ICampaignSuggestionEngine"/>. Combines product intelligence,
/// listing quality, inventory recommendation and pricing recommendation signals
/// into campaign suggestions. Returns recommendation objects only — no marketing
/// text. No AI, no external APIs, no randomness.
/// </summary>
public sealed class CampaignSuggestionEngine : ICampaignSuggestionEngine
{
    private readonly IProductIntelligenceEngine _productIntelligence;
    private readonly IListingQualityEngine _listingQuality;
    private readonly IInventoryRecommendationEngine _inventory;
    private readonly IPricingRecommendationEngine _pricing;

    // ---- Priority thresholds ----
    private const int CriticalPriorityThreshold = 80;
    private const int HighPriorityThreshold = 60;
    private const int MediumPriorityThreshold = 40;

    // ---- Score weights ----
    private const int ProductScoreWeight = 35;
    private const int ListingScoreWeight = 25;
    private const int InventoryScoreWeight = 25;
    private const int PricingScoreWeight = 15;
    private const int TotalScoreWeight = ProductScoreWeight + ListingScoreWeight + InventoryScoreWeight + PricingScoreWeight;

    private readonly ILogger<CampaignSuggestionEngine> _logger;

    public CampaignSuggestionEngine(
        IProductIntelligenceEngine productIntelligence,
        IListingQualityEngine listingQuality,
        IInventoryRecommendationEngine inventory,
        IPricingRecommendationEngine pricing,
        ILogger<CampaignSuggestionEngine> logger)
    {
        _productIntelligence = productIntelligence ?? throw new ArgumentNullException(nameof(productIntelligence));
        _listingQuality = listingQuality ?? throw new ArgumentNullException(nameof(listingQuality));
        _inventory = inventory ?? throw new ArgumentNullException(nameof(inventory));
        _pricing = pricing ?? throw new ArgumentNullException(nameof(pricing));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public CampaignSuggestionResultDto Suggest(FlipkartProduct product, ListingEvaluationInput listing)
    {
        if (product is null)
            throw new ArgumentNullException(nameof(product));
        if (listing is null)
            throw new ArgumentNullException(nameof(listing));

        var intelligence = _productIntelligence.Analyze(product);
        var listingResult = _listingQuality.Evaluate(listing);
        var inventoryResult = _inventory.Recommend(product);
        var pricingResult = _pricing.Recommend(product);

        var (objective, campaignPrice, discountPercent, restockQuantity, rationale) = DeriveCampaignParameters(
            product, intelligence, listingResult, inventoryResult, pricingResult);

        var inventoryScore = InventoryScore(inventoryResult);
        var pricingScore = PricingScore(pricingResult);

        var score = CalculateOverallScore(
            intelligence.OverallProductScore,
            listingResult.OverallScore,
            inventoryScore,
            pricingScore);

        var priority = DeterminePriority(score);
        var expectedRoi = CalculateExpectedRoi(intelligence, pricingResult, score);
        var estimatedRevenue = CalculateEstimatedRevenue(pricingResult, intelligence, score);

        _logger.LogInformation(
            "CampaignSuggestionEngine: '{ProductName}' — Objective {Objective} | Priority {Priority} | " +
            "Score {Score}/100 | Price {Price:F0} | ROI {Roi:F1}x | Revenue {Revenue}.",
            product.Name,
            objective,
            priority,
            score,
            campaignPrice,
            expectedRoi,
            estimatedRevenue);

        return new CampaignSuggestionResultDto
        {
            ProductId = product.ProductId,
            ProductName = product.Name,
            Category = product.Category,
            Objective = objective,
            Priority = priority,
            Score = score,
            ExpectedRoi = Math.Round(expectedRoi, 2),
            EstimatedRevenue = estimatedRevenue,
            CampaignPrice = campaignPrice,
            DiscountPercent = discountPercent,
            RestockQuantity = restockQuantity,
            Rationale = rationale,
            ProductScore = intelligence.OverallProductScore,
            ListingScore = listingResult.OverallScore,
            InventoryAction = inventoryResult.Action.ToString(),
            InventoryRisk = inventoryResult.Risk.ToString(),
        };
    }

    public IReadOnlyList<CampaignSuggestionResultDto> SuggestBatch(
        IReadOnlyList<FlipkartProduct> products,
        IReadOnlyDictionary<string, ListingEvaluationInput> listings)
    {
        if (products is null)
            throw new ArgumentNullException(nameof(products));
        if (listings is null)
            throw new ArgumentNullException(nameof(listings));

        var results = new List<CampaignSuggestionResultDto>(products.Count);

        foreach (var product in products)
        {
            if (listings.TryGetValue(product.ProductId, out var listing))
            {
                results.Add(Suggest(product, listing));
            }
        }

        return results
            .OrderByDescending(r => r.Score)
            .ToList();
    }

    // -------------------------------------------------------------------
    // Campaign parameter derivation
    // -------------------------------------------------------------------

    private static (CampaignObjectiveType Objective, double CampaignPrice, double? DiscountPercent, int? RestockQuantity, string Rationale)
        DeriveCampaignParameters(
            FlipkartProduct product,
            ProductIntelligenceResultDto intelligence,
            ListingQualityResultDto listingResult,
            InventoryRecommendationResultDto inventoryResult,
            PricingRecommendationResultDto pricingResult)
    {
        var action = inventoryResult.Action;
        var marginPct = intelligence.MarginPercentage;
        var score = intelligence.OverallProductScore;

        // ---- Restock recommendation ----
        if (action == RecommendedAction.Restock)
        {
            var rationale = $"Low stock with {intelligence.SalesVelocity:F1}/day velocity. "
                + $"Restock {inventoryResult.RestockQuantity} units, then promote with {marginPct:F0}% margin.";
            return (CampaignObjectiveType.RestockAndPromote, pricingResult.SuggestedSellingPrice, null, inventoryResult.RestockQuantity, rationale);
        }

        // ---- Liquidate recommendation ----
        if (action == RecommendedAction.Liquidate)
        {
            var discount = inventoryResult.DiscountPercent ?? 25.0;
            var campaignPrice = pricingResult.CurrentSellingPrice * (1 - discount / 100.0);
            var rationale = $"Overstock ({product.Stock} units) with slow velocity. "
                + $"Liquidate with {discount:F0}% discount to free working capital.";
            return (CampaignObjectiveType.ClearInventory, Math.Round(campaignPrice), discount, null, rationale);
        }

        // ---- Discount recommendation ----
        if (action == RecommendedAction.Discount)
        {
            var discount = inventoryResult.DiscountPercent ?? 15.0;
            var campaignPrice = pricingResult.CurrentSellingPrice * (1 - discount / 100.0);
            var rationale = $"Discount recommended: {discount:F0}% off to accelerate sell-through. "
                + $"Margin {marginPct:F0}%, velocity {intelligence.SalesVelocity:F1}/day.";
            return (CampaignObjectiveType.Discount, Math.Round(campaignPrice), discount, null, rationale);
        }

        // ---- Promote recommendation ----
        if (action == RecommendedAction.Promote)
        {
            var rationale = $"Strong product: {marginPct:F0}% margin, {intelligence.SalesVelocity:F1}/day velocity, "
                + $"score {score}/100. Promote aggressively.";
            return (CampaignObjectiveType.Promote, pricingResult.SuggestedSellingPrice, null, null, rationale);
        }

        // ---- New product launch ----
        if (intelligence.SalesVelocity < 1.0 && product.Stock > 0 && score >= 50)
        {
            var rationale = $"New or slow-moving product with potential (score {score}/100). "
                + $"Launch campaign to build awareness.";
            return (CampaignObjectiveType.LaunchProduct, pricingResult.SuggestedSellingPrice, null, null, rationale);
        }

        // ---- High margin + healthy stock: Increase sales ----
        if (marginPct >= 30 && intelligence.StockHealth == StockHealth.Healthy)
        {
            var rationale = $"Healthy stock with {marginPct:F0}% margin. Increase sales through targeted campaign.";
            return (CampaignObjectiveType.IncreaseSales, pricingResult.SuggestedSellingPrice, null, null, rationale);
        }

        // ---- Default: Hold ----
        var holdRationale = $"Score {score}/100, margin {marginPct:F0}%, velocity {intelligence.SalesVelocity:F1}/day. "
            + $"No strong campaign signal — hold position.";
        return (CampaignObjectiveType.Hold, pricingResult.CurrentSellingPrice, null, null, holdRationale);
    }

    // -------------------------------------------------------------------
    // Scoring
    // -------------------------------------------------------------------

    private static int CalculateOverallScore(int productScore, int listingScore, int inventoryScore, int pricingScore)
    {
        var weighted =
            (productScore * ProductScoreWeight)
            + (listingScore * ListingScoreWeight)
            + (inventoryScore * InventoryScoreWeight)
            + (pricingScore * PricingScoreWeight);

        return Math.Clamp((int)Math.Round((double)weighted / TotalScoreWeight), 0, 100);
    }

    private static int InventoryScore(InventoryRecommendationResultDto inventory)
    {
        // Higher score for actionable recommendations
        return inventory.Action switch
        {
            RecommendedAction.Promote => 90,
            RecommendedAction.Restock => 75,
            RecommendedAction.Discount => 60,
            RecommendedAction.Liquidate => 40,
            RecommendedAction.Hold => 50,
            RecommendedAction.Discontinue => 20,
            _ => 50,
        };
    }

    private static int PricingScore(PricingRecommendationResultDto pricing)
    {
        // Score based on margin health
        var marginPct = pricing.CurrentMarginPercentage;
        if (marginPct >= 45) return 90;
        if (marginPct >= 30) return 75;
        if (marginPct >= 20) return 60;
        if (marginPct >= 10) return 40;
        return 20;
    }

    // -------------------------------------------------------------------
    // Priority
    // -------------------------------------------------------------------

    private static CampaignSuggestionPriority DeterminePriority(int score) =>
        score >= CriticalPriorityThreshold ? CampaignSuggestionPriority.Critical
        : score >= HighPriorityThreshold ? CampaignSuggestionPriority.High
        : score >= MediumPriorityThreshold ? CampaignSuggestionPriority.Medium
        : CampaignSuggestionPriority.Low;

    // -------------------------------------------------------------------
    // ROI and revenue estimation
    // -------------------------------------------------------------------

    private static double CalculateExpectedRoi(
        ProductIntelligenceResultDto intelligence,
        PricingRecommendationResultDto pricing,
        int score)
    {
        var marginFactor = intelligence.MarginPercentage / 100.0;
        var scoreFactor = score / 100.0;
        return 1.0 + (marginFactor * 3.0) + (scoreFactor * 1.5);
    }

    private static long CalculateEstimatedRevenue(
        PricingRecommendationResultDto pricing,
        ProductIntelligenceResultDto intelligence,
        int score)
    {
        var price = pricing.SuggestedSellingPrice;
        var projectedUnits = pricing.ProjectedUnits;
        var scoreFactor = score / 100.0;

        return (long)(price * projectedUnits * scoreFactor);
    }
}
