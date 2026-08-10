using Microsoft.Extensions.Logging;
using Vrindaya.Api.AI.Flipkart.DTOs;
using Vrindaya.Api.AI.Flipkart.Interfaces;
using Vrindaya.Api.AI.Flipkart.Models;
using static Vrindaya.Api.AI.Flipkart.Engines.PricingRecommendationConstants;

namespace Vrindaya.Api.AI.Flipkart.Engines;

/// <summary>
/// Default <see cref="IPricingRecommendationEngine"/>. Computes current margin,
/// competitive margin, suggested selling price, minimum safe price, maximum
/// suggested price and expected profit purely from the product's own attributes.
/// No AI, no external APIs, no randomness.
/// </summary>
public sealed class PricingRecommendationEngine : IPricingRecommendationEngine
{
    private readonly ILogger<PricingRecommendationEngine> _logger;

    public PricingRecommendationEngine(ILogger<PricingRecommendationEngine> logger)
    {
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public PricingRecommendationResultDto Recommend(FlipkartProduct product)
    {
        if (product is null)
            throw new ArgumentNullException(nameof(product));

        var purchaseCost = product.PurchaseCost;
        var currentSellingPrice = product.SellingPrice;

        // Current margin
        var currentMargin = currentSellingPrice - purchaseCost;
        var currentMarginPercentage = currentSellingPrice > 0
            ? currentMargin / currentSellingPrice * 100.0
            : 0.0;

        // Competitive margin (category-based heuristic)
        var competitiveMargin = CompetitiveMarginRatio(product.Category);
        var competitiveMarginPercentage = competitiveMargin * 100.0;

        // Commission rate
        var commissionRate = product.FlipkartCommission ?? DefaultCommissionRate;
        commissionRate = Math.Clamp(commissionRate, MinCommissionRate, MaxCommissionRate);

        // Minimum safe price: cost + minimum margin, accounting for commission
        var minimumSafePrice = purchaseCost / (1.0 - MinimumMarginRatio - commissionRate);
        minimumSafePrice = Math.Max(minimumSafePrice, purchaseCost * MinPriceMarkupRatio);

        // Maximum suggested price: cost + maximum markup
        var maximumSuggestedPrice = purchaseCost * MaxPriceMarkupRatio;

        // Suggested selling price: based on competitive margin target
        var targetMargin = Math.Max(competitiveMargin, MinimumMarginRatio);
        var suggestedSellingPrice = purchaseCost / (1.0 - targetMargin - commissionRate);

        // Clamp suggested price within safe bounds
        suggestedSellingPrice = Math.Clamp(suggestedSellingPrice, minimumSafePrice, maximumSuggestedPrice);

        // Round to nearest whole number for practical pricing
        suggestedSellingPrice = Math.Round(suggestedSellingPrice);

        // Ensure suggested price doesn't go below minimum after rounding
        if (suggestedSellingPrice < minimumSafePrice)
            suggestedSellingPrice = Math.Ceiling(minimumSafePrice);

        // Suggested margin at the recommended price
        var suggestedMargin = suggestedSellingPrice - purchaseCost;

        // Net margin after commission
        var netMarginAfterCommission = suggestedMargin - (suggestedSellingPrice * commissionRate);

        // Sales velocity (units per day)
        var ageDays = Math.Max(1, (DateTime.UtcNow - product.CreatedDate).TotalDays);
        var unitsPerDay = product.Sales / ageDays;

        // Projected units over the projection period
        var projectedUnits = unitsPerDay * ProjectionDays;

        // Expected profit at suggested price
        var expectedProfit = netMarginAfterCommission * projectedUnits;

        _logger.LogInformation(
            "PricingRecommendationEngine: '{ProductName}' — Cost {Cost:F0} | Current {Current:F0} ({Margin:F1}%) | " +
            "Suggested {Suggested:F0} | Safe [{Min:F0}–{Max:F0}] | Expected Profit {Profit:F0}.",
            product.Name,
            purchaseCost,
            currentSellingPrice,
            currentMarginPercentage,
            suggestedSellingPrice,
            minimumSafePrice,
            maximumSuggestedPrice,
            expectedProfit);

        return new PricingRecommendationResultDto
        {
            ProductId = product.ProductId,
            ProductName = product.Name,
            PurchaseCost = purchaseCost,
            CurrentSellingPrice = currentSellingPrice,
            CurrentMargin = currentMargin,
            CurrentMarginPercentage = currentMarginPercentage,
            CompetitiveMargin = competitiveMargin,
            CompetitiveMarginPercentage = competitiveMarginPercentage,
            SuggestedSellingPrice = suggestedSellingPrice,
            SuggestedMargin = suggestedMargin,
            MinimumSafePrice = Math.Round(minimumSafePrice),
            MaximumSuggestedPrice = Math.Round(maximumSuggestedPrice),
            ExpectedProfit = Math.Round(expectedProfit),
            ProjectedUnits = Math.Round(projectedUnits, 1),
            CommissionRate = commissionRate,
            NetMarginAfterCommission = Math.Round(netMarginAfterCommission, 2),
        };
    }

    // -------------------------------------------------------------------
    // Category-based competitive margin heuristic
    // -------------------------------------------------------------------

    private static double CompetitiveMarginRatio(string category)
    {
        if (string.IsNullOrWhiteSpace(category))
            return HealthyMarginRatio;

        var normalized = category.ToLowerInvariant().Trim();

        return normalized switch
        {
            var c when c.Contains("clothing") || c.Contains("apparel") || c.Contains("fashion") => 0.45,
            var c when c.Contains("electronics") || c.Contains("mobile") || c.Contains("gadget") => 0.15,
            var c when c.Contains("jewellery") || c.Contains("jewelry") => 0.50,
            var c when c.Contains("footwear") || c.Contains("shoes") => 0.40,
            var c when c.Contains("home") || c.Contains("furniture") || c.Contains("decor") => 0.35,
            var c when c.Contains("beauty") || c.Contains("personal care") => 0.55,
            var c when c.Contains("grocery") || c.Contains("food") => 0.12,
            var c when c.Contains("toy") || c.Contains("kids") => 0.30,
            var c when c.Contains("book") || c.Contains("stationery") => 0.25,
            var c when c.Contains("health") || c.Contains("wellness") => 0.40,
            _ => HealthyMarginRatio,
        };
    }
}
