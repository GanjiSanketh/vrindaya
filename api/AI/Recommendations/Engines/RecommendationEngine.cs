using Vrindaya.Api.AI.Campaigns.Models;
using Vrindaya.Api.AI.Recommendations.DTOs;
using Vrindaya.Api.AI.Recommendations.Models;
using static Vrindaya.Api.AI.Recommendations.Engines.RecommendationConstants;

namespace Vrindaya.Api.AI.Recommendations.Engines;

/// <summary>
/// Default recommendation engine. Each category is derived from deterministic,
/// attribute-based rules — no ML models and no randomness. Repeated runs over
/// the same input always yield the same output.
/// </summary>
public sealed class RecommendationEngine : IRecommendationEngine
{
    public RecommendationCollection Generate(RecommendationRequest request)
    {
        var products = Filter(request);

        var result = new RecommendationCollection();

        GenerateDiscount(products, result, request.MaxPerType);
        GenerateBundle(products, result, request.MaxPerType);
        GenerateUpsell(products, result, request.MaxPerType);
        GenerateCrossSell(products, result, request.MaxPerType);
        GenerateClearance(products, result, request.MaxPerType);

        return result;
    }

    private static IReadOnlyList<CampaignProduct> Filter(RecommendationRequest request)
    {
        var source = request.Products ?? Enumerable.Empty<CampaignProduct>();
        var query = source.AsEnumerable();

        if (!string.IsNullOrWhiteSpace(request.Category))
            query = query.Where(p => p.Category == request.Category);

        if (request.ProductIds?.Count > 0)
            query = query.Where(p => request.ProductIds.Contains(p.ProductId));

        return query.ToList();
    }

    private static double MarginRatio(CampaignProduct p) =>
        p.SellingPrice > 0
            ? (p.SellingPrice - p.PurchaseCost) / p.SellingPrice
            : 0.0;

    private static double UnitsPerDay(CampaignProduct p)
    {
        var ageDays = (DateTime.UtcNow - p.CreatedDate).TotalDays;
        return ageDays > 0 ? p.Sales / ageDays : 0.0;
    }

    private static int DaysOld(CampaignProduct p) =>
        (DateTime.UtcNow.Date - p.CreatedDate.Date).Days;

    private static double ClampConfidence(double score) =>
        Math.Clamp(score, MinConfidence, MaxConfidence);

    private static void GenerateDiscount(IReadOnlyList<CampaignProduct> products, RecommendationCollection result, int maxPerType)
    {
        // Candidates: low margin with enough stock that a discount can clear it
        // while still preserving a positive contribution.
        var candidates = products
            .Where(p => p.Stock > LowStockThreshold && MarginRatio(p) <= LowMarginRatio)
            .OrderByDescending(MarginRatio)
            .Take(maxPerType)
            .ToList();

        foreach (var p in candidates)
        {
            var margin = MarginRatio(p);
            var confidence = ClampConfidence(margin / LowMarginRatio);
            result.Discount.Add(new Recommendation
            {
                ProductId = p.ProductId,
                ProductName = p.Name,
                Category = p.Category,
                Type = RecommendationType.Discount,
                Reason = $"Low gross margin ({margin:P0}) with adequate stock (Stock={p.Stock}); a targeted discount can accelerate turnover without sacrificing much contribution.",
                ConfidenceScore = confidence,
                ExpectedROI = DiscountExpectedROI,
            });
        }
    }

    private static void GenerateBundle(IReadOnlyList<CampaignProduct> products, RecommendationCollection result, int maxPerType)
    {
        // Candidates: high-margin SKUs whose category has at least one companion
        // product — bundle the strongest with complementary items to lift AOV.
        var candidates = products
            .Where(p => p.Stock > LowStockThreshold && MarginRatio(p) >= MediumMarginRatio)
            .GroupBy(p => p.Category)
            .Where(g => g.Count() >= 2)
            .Select(g => g.OrderByDescending(MarginRatio).First())
            .OrderByDescending(MarginRatio)
            .Take(maxPerType)
            .ToList();

        foreach (var p in candidates)
        {
            var margin = MarginRatio(p);
            var confidence = ClampConfidence(margin / HighMarginRatio);
            result.Bundle.Add(new Recommendation
            {
                ProductId = p.ProductId,
                ProductName = p.Name,
                Category = p.Category,
                Type = RecommendationType.Bundle,
                Reason = $"High-margin SKU (margin {margin:P0}, Stock={p.Stock}) with multiple candidates in '{p.Category}'; pair with complementary items to lift basket value.",
                ConfidenceScore = confidence,
                ExpectedROI = BundleExpectedROI,
            });
        }
    }

    private static void GenerateUpsell(IReadOnlyList<CampaignProduct> products, RecommendationCollection result, int maxPerType)
    {
        // Candidates: high-margin products that still move — prime checkout upsell.
        var candidates = products
            .Where(p => MarginRatio(p) >= HighMarginRatio && UnitsPerDay(p) >= SlowVelocityUnitsPerDay)
            .OrderByDescending(MarginRatio)
            .Take(maxPerType)
            .ToList();

        foreach (var p in candidates)
        {
            var margin = MarginRatio(p);
            var velocity = UnitsPerDay(p);
            var confidence = ClampConfidence(margin / HighMarginRatio);
            result.Upsell.Add(new Recommendation
            {
                ProductId = p.ProductId,
                ProductName = p.Name,
                Category = p.Category,
                Type = RecommendationType.Upsell,
                Reason = $"Premium SKU with {margin:P0} margin and solid velocity ({velocity:F1}/day); prime upsell target at checkout.",
                ConfidenceScore = confidence,
                ExpectedROI = UpsellExpectedROI,
            });
        }
    }

    private static void GenerateCrossSell(IReadOnlyList<CampaignProduct> products, RecommendationCollection result, int maxPerType)
    {
        // Candidates: the fastest seller in each category — cross-sell across baskets.
        var candidates = products
            .Where(p => UnitsPerDay(p) >= SlowVelocityUnitsPerDay)
            .GroupBy(p => p.Category)
            .Select(g => g.OrderByDescending(UnitsPerDay).First())
            .OrderByDescending(UnitsPerDay)
            .Take(maxPerType)
            .ToList();

        foreach (var p in candidates)
        {
            var velocity = UnitsPerDay(p);
            var confidence = ClampConfidence(velocity / FastVelocityUnitsPerDay);
            result.CrossSell.Add(new Recommendation
            {
                ProductId = p.ProductId,
                ProductName = p.Name,
                Category = p.Category,
                Type = RecommendationType.CrossSell,
                Reason = $"Top seller in '{p.Category}' ({velocity:F1}/day); cross-sell into baskets containing other categories.",
                ConfidenceScore = confidence,
                ExpectedROI = CrossSellExpectedROI,
            });
        }
    }

    private static void GenerateClearance(IReadOnlyList<CampaignProduct> products, RecommendationCollection result, int maxPerType)
    {
        // Candidates: low stock (urgent) OR aged products moving slowly.
        var candidates = products
            .Where(p => p.Stock <= LowStockThreshold
                || (DaysOld(p) >= AgedProductDays && UnitsPerDay(p) <= SlowVelocityUnitsPerDay))
            .OrderBy(p => p.Stock)
            .Take(maxPerType)
            .ToList();

        foreach (var p in candidates)
        {
            var aged = DaysOld(p);
            var stockLow = p.Stock <= LowStockThreshold;
            var confidence = stockLow
                ? 0.90
                : ClampConfidence(0.50 + (aged - AgedProductDays) / (double)AgedProductDays * 0.50);

            var suffix = stockLow
                ? " with low-stock urgency"
                : aged >= AgedProductDays ? $", aged {aged} days with slow velocity" : "";

            result.Clearance.Add(new Recommendation
            {
                ProductId = p.ProductId,
                ProductName = p.Name,
                Category = p.Category,
                Type = RecommendationType.Clearance,
                Reason = $"Stock at {p.Stock} units{suffix}; prioritize clearance to recover carrying cost.",
                ConfidenceScore = confidence,
                ExpectedROI = ClearanceExpectedROI,
            });
        }
    }
}
