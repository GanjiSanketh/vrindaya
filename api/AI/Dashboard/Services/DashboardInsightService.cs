using Vrindaya.Api.AI.Campaigns.Dtos;
using Vrindaya.Api.AI.Campaigns.Interfaces;
using Vrindaya.Api.AI.Campaigns.Models;
using Vrindaya.Api.AI.Dashboard.DTOs;
using Vrindaya.Api.AI.Dashboard.Interfaces;
using Vrindaya.Api.AI.Flipkart.DTOs;
using Vrindaya.Api.AI.Flipkart.Interfaces;
using Vrindaya.Api.AI.Flipkart.Models;
using Vrindaya.Api.AI.Flipkart.Services;
using Vrindaya.Api.AI.Recommendations.DTOs;
using Vrindaya.Api.AI.Recommendations.Engines;
using Vrindaya.Api.AI.Recommendations.Services;

namespace Vrindaya.Api.AI.Dashboard.Services;

/// <summary>
/// Default <see cref="IDashboardInsightService"/>. Fans a single product pool
/// out to the existing engines — <see cref="IProductIntelligenceEngine"/>,
/// <see cref="IRecommendationEngine"/>, <see cref="ICampaignEngine"/>,
/// <see cref="IListingQualityEngine"/> and
/// <see cref="IInventoryRecommendationEngine"/> — and rolls their results into
/// one dashboard DTO. Every number originates from a module; this service only
/// orders, caps and summarises.
///
/// Two narration passes run over those results — the recommendation reasons and
/// the product-intelligence analyses are written by the configured AI provider.
/// Narration is applied only to the capped, already-ordered sections, so the
/// dashboard never pays for prose it will not display, and it never changes a
/// score, an ordering or a recommended action.
/// </summary>
public sealed class DashboardInsightService : IDashboardInsightService
{
    /// <summary>Upper bound on the roll-up action list.</summary>
    private const int MaxTopActions = 8;

    /// <summary>Inventory risk bands counted as "at risk" in the summary.</summary>
    private static readonly InventoryRisk[] AtRiskLevels = [InventoryRisk.Critical, InventoryRisk.High];

    private readonly IProductIntelligenceEngine _productIntelligence;
    private readonly IRecommendationEngine _recommendations;
    private readonly ICampaignEngine _campaigns;
    private readonly IListingQualityEngine _listingQuality;
    private readonly IInventoryRecommendationEngine _inventory;
    private readonly IProductIntelligenceNarrator _intelligenceNarrator;
    private readonly IRecommendationNarrator _recommendationNarrator;
    private readonly ILogger<DashboardInsightService> _logger;

    public DashboardInsightService(
        IProductIntelligenceEngine productIntelligence,
        IRecommendationEngine recommendations,
        ICampaignEngine campaigns,
        IListingQualityEngine listingQuality,
        IInventoryRecommendationEngine inventory,
        IProductIntelligenceNarrator intelligenceNarrator,
        IRecommendationNarrator recommendationNarrator,
        ILogger<DashboardInsightService> logger)
    {
        _productIntelligence = productIntelligence ?? throw new ArgumentNullException(nameof(productIntelligence));
        _recommendations = recommendations ?? throw new ArgumentNullException(nameof(recommendations));
        _campaigns = campaigns ?? throw new ArgumentNullException(nameof(campaigns));
        _listingQuality = listingQuality ?? throw new ArgumentNullException(nameof(listingQuality));
        _inventory = inventory ?? throw new ArgumentNullException(nameof(inventory));
        _intelligenceNarrator = intelligenceNarrator ?? throw new ArgumentNullException(nameof(intelligenceNarrator));
        _recommendationNarrator = recommendationNarrator ?? throw new ArgumentNullException(nameof(recommendationNarrator));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public async Task<DashboardInsightsDto> GetInsightsAsync(
        DashboardInsightsRequestDto request,
        CancellationToken cancellationToken = default)
    {
        if (request is null)
            throw new ArgumentNullException(nameof(request));

        cancellationToken.ThrowIfCancellationRequested();

        var products = request.Products ?? [];
        var listings = request.Listings ?? [];
        var maxPerSection = Math.Max(1, request.MaximumPerSection);

        var intelligence = BuildProductIntelligence(products);
        var inventoryStatus = BuildInventoryStatus(products);
        var listingQuality = BuildListingQuality(products, listings);
        var recommendations = BuildRecommendations(products, maxPerSection);
        var campaigns = BuildCampaigns(products, request.Campaign, maxPerSection);

        var topIntelligence = intelligence.Take(maxPerSection).ToList();

        await NarrateIntelligenceAsync(products, topIntelligence, cancellationToken);
        recommendations = await _recommendationNarrator.NarrateAsync(recommendations, cancellationToken);

        var insights = new DashboardInsightsDto
        {
            ProductIntelligence = topIntelligence,
            Recommendations = recommendations,
            Campaigns = campaigns,
            ListingQuality = [.. listingQuality.Take(maxPerSection)],
            InventoryStatus = [.. inventoryStatus.Take(maxPerSection)],
            GeneratedAt = DateTime.UtcNow,
        };

        insights.Summary = BuildSummary(
            products.Count,
            intelligence,
            listingQuality,
            inventoryStatus,
            recommendations,
            campaigns);

        _logger.LogInformation(
            "DashboardInsightService: aggregated {ProductCount} products - health {Health}/100, " +
            "{AtRisk} at risk, {Recommendations} recommendations, {Campaigns} campaigns.",
            products.Count,
            insights.Summary.HealthScore,
            insights.Summary.ProductsAtRisk,
            insights.Summary.TotalRecommendations,
            insights.Summary.TotalCampaigns);

        return insights;
    }

    /// <summary>
    /// Attaches a written analysis to each displayed product-intelligence
    /// result. Only the capped set is narrated, and a product whose source
    /// record is missing is left with its metrics alone.
    /// </summary>
    private async Task NarrateIntelligenceAsync(
        List<FlipkartProduct> products,
        List<ProductIntelligenceResultDto> intelligence,
        CancellationToken cancellationToken)
    {
        if (intelligence.Count == 0)
            return;

        var byId = products
            .GroupBy(p => p.ProductId, StringComparer.OrdinalIgnoreCase)
            .ToDictionary(g => g.Key, g => g.First(), StringComparer.OrdinalIgnoreCase);

        foreach (var result in intelligence)
        {
            if (!byId.TryGetValue(result.ProductId, out var product))
                continue;

            result.Analysis = await _intelligenceNarrator.NarrateAsync(product, result, cancellationToken);
        }
    }

    // -------------------------------------------------------------------
    // Module fan-out — each helper delegates to one existing engine
    // -------------------------------------------------------------------

    private List<ProductIntelligenceResultDto> BuildProductIntelligence(List<FlipkartProduct> products) =>
        [.. products
            .Select(_productIntelligence.Analyze)
            .OrderByDescending(r => r.OverallProductScore)];

    private List<InventoryRecommendationResultDto> BuildInventoryStatus(List<FlipkartProduct> products) =>
        [.. products
            .Select(_inventory.Recommend)
            .OrderBy(r => r.Risk)
            .ThenByDescending(r => r.SalesVelocity)];

    private List<DashboardListingQualityDto> BuildListingQuality(
        List<FlipkartProduct> products,
        Dictionary<string, ListingEvaluationInput> listings)
    {
        var results = new List<DashboardListingQualityDto>(listings.Count);

        foreach (var product in products)
        {
            if (!listings.TryGetValue(product.ProductId, out var listing))
                continue;

            results.Add(new DashboardListingQualityDto
            {
                ProductId = product.ProductId,
                ProductName = product.Name,
                Quality = _listingQuality.Evaluate(listing),
            });
        }

        return [.. results.OrderBy(r => r.Quality.OverallScore)];
    }

    private RecommendationCollection BuildRecommendations(List<FlipkartProduct> products, int maxPerSection) =>
        _recommendations.Generate(new RecommendationRequest
        {
            Products = ToCampaignProducts(products),
            MaxPerType = maxPerSection,
        });

    private CampaignResponseDto BuildCampaigns(
        List<FlipkartProduct> products,
        CampaignRequestDto? campaignRequest,
        int maxPerSection)
    {
        var request = campaignRequest ?? new CampaignRequestDto();
        request.MaximumCampaigns = maxPerSection;

        return _campaigns.Generate(request, ToCampaignProducts(products));
    }

    /// <summary>
    /// Projects the Flipkart product view onto the shared campaign product view
    /// consumed by the campaign and recommendation engines.
    /// </summary>
    private static List<CampaignProduct> ToCampaignProducts(List<FlipkartProduct> products) =>
        [.. products.Select(p => new CampaignProduct(
            p.ProductId,
            p.Name,
            p.Category,
            p.Price,
            p.PurchaseCost,
            p.SellingPrice,
            p.Stock,
            p.Sales,
            p.CreatedDate))];

    // -------------------------------------------------------------------
    // Roll-up
    // -------------------------------------------------------------------

    private static DashboardSummaryDto BuildSummary(
        int productCount,
        List<ProductIntelligenceResultDto> intelligence,
        List<DashboardListingQualityDto> listingQuality,
        List<InventoryRecommendationResultDto> inventoryStatus,
        RecommendationCollection recommendations,
        CampaignResponseDto campaigns)
    {
        var averageProductScore = Average(intelligence.Select(i => i.OverallProductScore));
        var averageListingScore = Average(listingQuality.Select(l => l.Quality.OverallScore));
        var averageCampaignScore = Average(campaigns.Campaigns.Select(c => c.Score));

        return new DashboardSummaryDto
        {
            TotalProductsAnalyzed = productCount,
            AverageProductScore = averageProductScore,
            AverageListingScore = averageListingScore,
            HealthScore = Average([averageProductScore, averageListingScore, averageCampaignScore]),
            ProductsAtRisk = inventoryStatus.Count(i => AtRiskLevels.Contains(i.Risk)),
            ProductsNeedingRestock = inventoryStatus.Count(i => i.Action == RecommendedAction.Restock),
            OverstockedProducts = inventoryStatus.Count(i => i.Action == RecommendedAction.Liquidate),
            TotalRecommendations = recommendations.TotalRecommendations,
            TotalCampaigns = campaigns.TotalCampaigns,
            TopActions = BuildTopActions(inventoryStatus, listingQuality, campaigns),
        };
    }

    private static int Average(IEnumerable<int> scores)
    {
        var values = scores as ICollection<int> ?? [.. scores];
        return values.Count == 0 ? 0 : (int)Math.Round(values.Average());
    }

    /// <summary>
    /// Collects the highest-value next actions across the modules. Every entry
    /// restates a module's own output — no new analysis is performed here.
    /// </summary>
    private static List<string> BuildTopActions(
        List<InventoryRecommendationResultDto> inventoryStatus,
        List<DashboardListingQualityDto> listingQuality,
        CampaignResponseDto campaigns)
    {
        var actions = new List<string>();

        actions.AddRange(inventoryStatus
            .Where(i => AtRiskLevels.Contains(i.Risk))
            .Select(i => $"{i.ProductName}: {i.Action} - {i.Rationale}"));

        actions.AddRange(listingQuality
            .SelectMany(l => l.Quality.Suggestions
                .Where(s => s.Severity == Flipkart.Analysis.QualitySeverity.High)
                .Select(s => $"{l.ProductName}: {s.Message}")));

        actions.AddRange(campaigns.Campaigns
            .Where(c => c.Priority is CampaignPriority.High or CampaignPriority.Critical)
            .Select(c => $"{c.ProductName}: {c.Title}"));

        return [.. actions.Take(MaxTopActions)];
    }
}
