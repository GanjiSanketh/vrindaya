using Microsoft.Extensions.Logging;
using Vrindaya.Api.AI.Flipkart.DTOs;
using static Vrindaya.Api.AI.Flipkart.Engines.ProductIntelligenceConstants;
using Vrindaya.Api.AI.Flipkart.Interfaces;
using Vrindaya.Api.AI.Flipkart.Models;

namespace Vrindaya.Api.AI.Flipkart.Engines;

/// <summary>
/// Default <see cref="IProductIntelligenceEngine"/>. Computes profit margin,
/// stock health, sales velocity, inventory risk, a recommended action and an
/// overall product score purely from the product's own attributes — no AI
/// provider calls, no Firestore reads, no randomness. Repeated runs over the
/// same input always yield the same output.
/// </summary>
public sealed class ProductIntelligenceEngine : IProductIntelligenceEngine
{
    private readonly ILogger<ProductIntelligenceEngine> _logger;

    public ProductIntelligenceEngine(ILogger<ProductIntelligenceEngine> logger)
    {
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public ProductIntelligenceResultDto Analyze(FlipkartProduct product)
    {
        if (product is null)
            throw new ArgumentNullException(nameof(product));

        var marginRatio = MarginRatio(product);
        var velocity = UnitsPerDay(product);
        var ageDays = DaysSinceCreated(product);
        var stockHealth = DetermineStockHealth(product.Stock);
        var inventoryRisk = DetermineInventoryRisk(stockHealth, velocity);

        var result = new ProductIntelligenceResultDto
        {
            ProductId = product.ProductId,
            ProductName = product.Name,
            Category = product.Category,
            ProfitMargin = product.SellingPrice - product.PurchaseCost,
            MarginPercentage = marginRatio * 100.0,
            StockHealth = stockHealth,
            SalesVelocity = velocity,
            DaysOfInventory = velocity > 0 ? (double)product.Stock / velocity : null,
            InventoryRisk = inventoryRisk,
            RecommendedAction = DetermineRecommendedAction(marginRatio, velocity, stockHealth, ageDays),
            OverallProductScore = ComputeOverallScore(marginRatio, stockHealth, velocity, product.Sales, ageDays, inventoryRisk),
        };

        _logger.LogInformation(
            "ProductIntelligenceEngine: analysed '{ProductName}' — Score {Score}/100 | " +
            "Margin {Margin:F1}% | Velocity {Velocity:F1}/day | Stock {Stock} | Risk {Risk} | Action {Action}.",
            product.Name,
            result.OverallProductScore,
            result.MarginPercentage,
            result.SalesVelocity,
            product.Stock,
            inventoryRisk,
            result.RecommendedAction);

        return result;
    }

    // -------------------------------------------------------------------
    // Stock health
    // -------------------------------------------------------------------

    private static StockHealth DetermineStockHealth(int stock) =>
        stock == 0 ? StockHealth.OutOfStock
        : stock <= LowStockThreshold ? StockHealth.Low
        : stock <= HealthyStockCeiling ? StockHealth.Healthy
        : StockHealth.Overstock;

    // -------------------------------------------------------------------
    // Inventory risk
    // -------------------------------------------------------------------

    private static InventoryRisk DetermineInventoryRisk(StockHealth stockHealth, double velocity)
    {
        if (stockHealth == StockHealth.OutOfStock)
            return InventoryRisk.Critical;

        if (stockHealth == StockHealth.Low && velocity >= HighVelocityUnitsPerDay)
            return InventoryRisk.High;

        if (stockHealth == StockHealth.Overstock && velocity < MediumVelocityUnitsPerDay)
            return InventoryRisk.High;

        if (stockHealth == StockHealth.Low || stockHealth == StockHealth.Overstock)
            return InventoryRisk.Medium;

        return velocity < LowVelocityUnitsPerDay
            ? InventoryRisk.Medium
            : InventoryRisk.Low;
    }

    // -------------------------------------------------------------------
    // Recommended action
    // -------------------------------------------------------------------

    private static RecommendedAction DetermineRecommendedAction(
        double marginRatio,
        double velocity,
        StockHealth stockHealth,
        int ageDays)
    {
        if (stockHealth == StockHealth.OutOfStock)
            return RecommendedAction.Restock;

        if (velocity < LowVelocityUnitsPerDay && ageDays > MatureAgeDays)
            return RecommendedAction.Discontinue;

        if (stockHealth == StockHealth.Overstock && velocity < MediumVelocityUnitsPerDay)
            return RecommendedAction.Liquidate;

        if (stockHealth == StockHealth.Low && velocity >= MediumVelocityUnitsPerDay)
            return RecommendedAction.Restock;

        if (stockHealth == StockHealth.Healthy
            && marginRatio >= HighMarginRatio
            && velocity >= MediumVelocityUnitsPerDay)
            return RecommendedAction.Promote;

        return RecommendedAction.Hold;
    }

    // -------------------------------------------------------------------
    // Overall product score (0–100, weighted)
    // -------------------------------------------------------------------

    private static int ComputeOverallScore(
        double marginRatio,
        StockHealth stockHealth,
        double velocity,
        int sales,
        int ageDays,
        InventoryRisk risk)
    {
        var marginScore = ScoreMarginQuality(marginRatio);
        var stockScore = ScoreStockHealth(stockHealth);
        var velocityScore = ScoreVelocity(velocity);
        var volumeScore = ScoreSalesVolume(sales);
        var ageScore = ScoreAge(ageDays);
        var riskScore = ScoreRisk(risk);

        var weighted =
            (marginScore * MarginQualityWeight)
            + (stockScore * StockHealthWeight)
            + (velocityScore * SalesVelocityWeight)
            + (volumeScore * SalesVolumeWeight)
            + (ageScore * ProductAgeWeight)
            + (riskScore * RiskMitigationWeight);

        var total = weighted / (double)TotalWeight;
        return (int)Math.Clamp(total, MinScore, MaxScore);
    }

    private static int ScoreMarginQuality(double marginRatio) =>
        marginRatio >= HighMarginRatio ? MaxScore
        : marginRatio >= MediumMarginRatio ? 70
        : marginRatio >= LowMarginRatio ? 40
        : 15;

    private static int ScoreStockHealth(StockHealth stockHealth) =>
        stockHealth == StockHealth.Healthy ? MaxScore
        : stockHealth == StockHealth.Overstock ? 50
        : stockHealth == StockHealth.Low ? 40
        : 0;

    private static int ScoreVelocity(double velocity) =>
        velocity >= HighVelocityUnitsPerDay ? MaxScore
        : velocity >= MediumVelocityUnitsPerDay ? 70
        : velocity >= LowVelocityUnitsPerDay ? 40
        : 15;

    private static int ScoreSalesVolume(int sales) =>
        sales >= 500 ? MaxScore
        : sales >= 100 ? 67
        : sales >= 10 ? 33
        : 0;

    private static int ScoreAge(int ageDays) =>
        ageDays <= LaunchAgeDays ? MaxScore
        : ageDays <= PrimeAgeDays ? 70
        : ageDays <= MatureAgeDays ? 40
        : 15;

    private static int ScoreRisk(InventoryRisk risk) =>
        risk == InventoryRisk.Low ? MaxScore
        : risk == InventoryRisk.Medium ? 67
        : risk == InventoryRisk.High ? 33
        : 0;

    // -------------------------------------------------------------------
    // Shared domain helpers (mirrors CampaignScoringEngine / RecommendationEngine)
    // -------------------------------------------------------------------

    private static double MarginRatio(FlipkartProduct product) =>
        product.SellingPrice > 0
            ? (product.SellingPrice - product.PurchaseCost) / product.SellingPrice
            : 0.0;

    private static double UnitsPerDay(FlipkartProduct product)
    {
        var ageDays = (DateTime.UtcNow - product.CreatedDate).TotalDays;
        return ageDays > 0 ? product.Sales / ageDays : 0.0;
    }

    private static int DaysSinceCreated(FlipkartProduct product) =>
        (DateTime.UtcNow.Date - product.CreatedDate.Date).Days;
}
