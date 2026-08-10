using Microsoft.Extensions.Logging;
using Vrindaya.Api.AI.Flipkart.DTOs;
using Vrindaya.Api.AI.Flipkart.Interfaces;
using Vrindaya.Api.AI.Flipkart.Models;

namespace Vrindaya.Api.AI.Flipkart.Services;

/// <summary>
/// Default <see cref="IFlipkartDashboardService"/>. Aggregates product
/// intelligence, pricing, inventory, listing quality and campaign suggestions
/// into a single dashboard DTO. No AI, no external APIs, no randomness.
/// </summary>
public sealed class FlipkartDashboardService : IFlipkartDashboardService
{
    private readonly IProductIntelligenceEngine _productIntelligence;
    private readonly IListingQualityEngine _listingQuality;
    private readonly IInventoryRecommendationEngine _inventory;
    private readonly IPricingRecommendationEngine _pricing;
    private readonly ICampaignSuggestionEngine _campaign;

    private readonly ILogger<FlipkartDashboardService> _logger;

    public FlipkartDashboardService(
        IProductIntelligenceEngine productIntelligence,
        IListingQualityEngine listingQuality,
        IInventoryRecommendationEngine inventory,
        IPricingRecommendationEngine pricing,
        ICampaignSuggestionEngine campaign,
        ILogger<FlipkartDashboardService> logger)
    {
        _productIntelligence = productIntelligence ?? throw new ArgumentNullException(nameof(productIntelligence));
        _listingQuality = listingQuality ?? throw new ArgumentNullException(nameof(listingQuality));
        _inventory = inventory ?? throw new ArgumentNullException(nameof(inventory));
        _pricing = pricing ?? throw new ArgumentNullException(nameof(pricing));
        _campaign = campaign ?? throw new ArgumentNullException(nameof(campaign));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public FlipkartDashboardDto GetDashboard(FlipkartProduct product, ListingEvaluationInput listing)
    {
        if (product is null)
            throw new ArgumentNullException(nameof(product));
        if (listing is null)
            throw new ArgumentNullException(nameof(listing));

        var intelligence = _productIntelligence.Analyze(product);
        var listingResult = _listingQuality.Evaluate(listing);
        var inventoryResult = _inventory.Recommend(product);
        var pricingResult = _pricing.Recommend(product);
        var campaignResult = _campaign.Suggest(product, listing);

        var healthScore = CalculateHealthScore(
            intelligence.OverallProductScore,
            listingResult.OverallScore,
            campaignResult.Score);

        var dashboard = new FlipkartDashboardDto
        {
            ProductId = product.ProductId,
            ProductName = product.Name,
            Category = product.Category,
            ProductScore = intelligence.OverallProductScore,
            ListingScore = listingResult.OverallScore,
            CampaignScore = campaignResult.Score,
            HealthScore = healthScore,
            ProductIntelligence = new ProductIntelligenceSummary
            {
                MarginPercentage = Math.Round(intelligence.MarginPercentage, 1),
                StockHealth = intelligence.StockHealth.ToString(),
                InventoryRisk = intelligence.InventoryRisk.ToString(),
                SalesVelocity = Math.Round(intelligence.SalesVelocity, 2),
                DaysOfInventory = intelligence.DaysOfInventory,
                RecommendedAction = intelligence.RecommendedAction.ToString(),
            },
            Pricing = new PricingSummary
            {
                CurrentPrice = pricingResult.CurrentSellingPrice,
                SuggestedPrice = pricingResult.SuggestedSellingPrice,
                MinimumSafePrice = pricingResult.MinimumSafePrice,
                MaximumSuggestedPrice = pricingResult.MaximumSuggestedPrice,
                CurrentMarginPercentage = Math.Round(pricingResult.CurrentMarginPercentage, 1),
                ExpectedProfit = pricingResult.ExpectedProfit,
                ProjectedUnits = pricingResult.ProjectedUnits,
            },
            Inventory = new InventorySummary
            {
                Stock = product.Stock,
                Action = inventoryResult.Action.ToString(),
                Risk = inventoryResult.Risk.ToString(),
                SalesVelocity = Math.Round(inventoryResult.SalesVelocity, 2),
                DaysOfInventory = inventoryResult.DaysOfInventory,
                InventoryAgeDays = inventoryResult.InventoryAgeDays,
                DiscountPercent = inventoryResult.DiscountPercent,
                RestockQuantity = inventoryResult.RestockQuantity,
            },
            ListingQuality = new ListingQualityBreakdown
            {
                TitleScore = listingResult.TitleScore,
                DescriptionScore = listingResult.DescriptionScore,
                BulletPointsScore = listingResult.BulletPointsScore,
                ImageCountScore = listingResult.ImageCountScore,
                SeoKeywordsScore = listingResult.SeoKeywordsScore,
                BrandConsistencyScore = listingResult.BrandConsistencyScore,
                AttributeCompletenessScore = listingResult.AttributeCompletenessScore,
            },
            Campaign = new CampaignSummary
            {
                Objective = campaignResult.Objective.ToString(),
                Priority = campaignResult.Priority.ToString(),
                ExpectedRoi = campaignResult.ExpectedRoi,
                EstimatedRevenue = campaignResult.EstimatedRevenue,
                CampaignPrice = campaignResult.CampaignPrice,
            },
            TopActions = BuildTopActions(intelligence, inventoryResult, campaignResult),
        };

        _logger.LogInformation(
            "FlipkartDashboardService: '{ProductName}' — Health {Health}/100 | " +
            "Product {Prod} | Listing {List} | Campaign {Camp}.",
            product.Name,
            healthScore,
            intelligence.OverallProductScore,
            listingResult.OverallScore,
            campaignResult.Score);

        return dashboard;
    }

    public IReadOnlyList<FlipkartDashboardDto> GetDashboardBatch(
        IReadOnlyList<FlipkartProduct> products,
        IReadOnlyDictionary<string, ListingEvaluationInput> listings)
    {
        if (products is null)
            throw new ArgumentNullException(nameof(products));
        if (listings is null)
            throw new ArgumentNullException(nameof(listings));

        var results = new List<FlipkartDashboardDto>(products.Count);

        foreach (var product in products)
        {
            if (listings.TryGetValue(product.ProductId, out var listing))
            {
                results.Add(GetDashboard(product, listing));
            }
        }

        return results
            .OrderByDescending(r => r.HealthScore)
            .ToList();
    }

    // -------------------------------------------------------------------
    // Health score
    // -------------------------------------------------------------------

    private static int CalculateHealthScore(int productScore, int listingScore, int campaignScore)
    {
        return (int)Math.Round((productScore + listingScore + campaignScore) / 3.0);
    }

    // -------------------------------------------------------------------
    // Top actions
    // -------------------------------------------------------------------

    private static List<string> BuildTopActions(
        ProductIntelligenceResultDto intelligence,
        InventoryRecommendationResultDto inventory,
        CampaignSuggestionResultDto campaign)
    {
        var actions = new List<string>();

        // Inventory-driven actions
        switch (inventory.Action)
        {
            case RecommendedAction.Restock:
                actions.Add($"Restock {inventory.RestockQuantity} units — low stock with {intelligence.SalesVelocity:F1}/day velocity.");
                break;
            case RecommendedAction.Liquidate:
                actions.Add("Liquidate overstock — slow velocity with excess inventory.");
                break;
            case RecommendedAction.Discount:
                actions.Add($"Offer {inventory.DiscountPercent:F0}% discount to accelerate sell-through.");
                break;
            case RecommendedAction.Promote:
                actions.Add("Promote aggressively — strong margin and healthy stock.");
                break;
        }

        // Pricing-driven actions
        if (campaign.DiscountPercent.HasValue && campaign.DiscountPercent.Value > 0)
        {
            actions.Add($"Set campaign price at ₹{campaign.CampaignPrice:F0} ({campaign.DiscountPercent:F0}% off).");
        }

        // Listing quality actions
        if (intelligence.OverallProductScore >= 70 && campaign.Score >= 60)
        {
            actions.Add("Campaign ready — strong product and listing scores.");
        }

        // Risk-driven actions
        if (intelligence.InventoryRisk == InventoryRisk.Critical || intelligence.InventoryRisk == InventoryRisk.High)
        {
            actions.Add($"Address {intelligence.InventoryRisk.ToString().ToLower()} inventory risk immediately.");
        }

        return actions;
    }
}
