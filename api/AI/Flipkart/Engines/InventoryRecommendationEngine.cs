using Microsoft.Extensions.Logging;
using Vrindaya.Api.AI.Flipkart.DTOs;
using Vrindaya.Api.AI.Flipkart.Interfaces;
using Vrindaya.Api.AI.Flipkart.Models;
using static Vrindaya.Api.AI.Flipkart.Engines.InventoryRecommendationConstants;

namespace Vrindaya.Api.AI.Flipkart.Engines;

/// <summary>
/// Default <see cref="IInventoryRecommendationEngine"/>. Generates inventory
/// recommendations — Restock, Liquidate, Promote, Hold, Discount — based on
/// stock, sales velocity, inventory age, profit and margin. No AI, no external
/// APIs, no randomness.
/// </summary>
public sealed class InventoryRecommendationEngine : IInventoryRecommendationEngine
{
    private readonly ILogger<InventoryRecommendationEngine> _logger;

    public InventoryRecommendationEngine(ILogger<InventoryRecommendationEngine> logger)
    {
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public InventoryRecommendationResultDto Recommend(FlipkartProduct product)
    {
        if (product is null)
            throw new ArgumentNullException(nameof(product));

        var stockHealth = DetermineStockHealth(product.Stock);
        var velocity = UnitsPerDay(product);
        var ageDays = DaysSinceCreated(product);
        var marginRatio = MarginRatio(product);
        var daysOfInventory = velocity > 0 ? (double)product.Stock / velocity : (double?)null;
        var risk = DetermineInventoryRisk(stockHealth, velocity, daysOfInventory);

        var (action, discountPercent, restockQuantity, rationale) = DetermineAction(
            product, stockHealth, velocity, ageDays, marginRatio, daysOfInventory, risk);

        _logger.LogInformation(
            "InventoryRecommendationEngine: '{ProductName}' — Action {Action} | " +
            "Stock {Stock} | Velocity {Velocity:F1}/day | Age {Age}d | Margin {Margin:F1}% | " +
            "Risk {Risk} | Rationale: {Rationale}.",
            product.Name,
            action,
            product.Stock,
            velocity,
            ageDays,
            marginRatio * 100.0,
            risk,
            rationale);

        return new InventoryRecommendationResultDto
        {
            ProductId = product.ProductId,
            ProductName = product.Name,
            Action = action,
            StockHealth = stockHealth,
            Risk = risk,
            SalesVelocity = Math.Round(velocity, 2),
            DaysOfInventory = daysOfInventory.HasValue ? Math.Round(daysOfInventory.Value, 1) : null,
            InventoryAgeDays = ageDays,
            MarginRatio = Math.Round(marginRatio, 4),
            DiscountPercent = discountPercent,
            RestockQuantity = restockQuantity,
            Rationale = rationale,
        };
    }

    // -------------------------------------------------------------------
    // Core recommendation logic
    // -------------------------------------------------------------------

    private static (RecommendedAction Action, double? DiscountPercent, int? RestockQuantity, string Rationale)
        DetermineAction(
            FlipkartProduct product,
            StockHealth stockHealth,
            double velocity,
            int ageDays,
            double marginRatio,
            double? daysOfInventory,
            InventoryRisk risk)
    {
        var stock = product.Stock;

        // ---- Critical: Out of stock ----
        if (stockHealth == StockHealth.OutOfStock)
        {
            var restockQty = CalculateRestockQuantity(velocity, ageDays);
            return (RecommendedAction.Restock, null, restockQty,
                $"Out of stock with {velocity:F1} units/day velocity — immediate restock of {restockQty} units required.");
        }

        // ---- Critical: Low stock with high velocity ----
        if (stockHealth == StockHealth.Low && velocity >= MediumVelocity)
        {
            var restockQty = CalculateRestockQuantity(velocity, ageDays);
            return (RecommendedAction.Restock, null, restockQty,
                $"Low stock ({stock}) with {velocity:F1} units/day velocity — restock {restockQty} units to avoid stockout.");
        }

        // ---- Overstock with slow velocity: Liquidate ----
        if (stockHealth == StockHealth.Overstock && velocity < MediumVelocity)
        {
            return (RecommendedAction.Liquidate, null, null,
                $"Overstock ({stock}) with slow velocity ({velocity:F1}/day) — liquidate to free working capital.");
        }

        // ---- Excess days of inventory: Liquidate ----
        if (daysOfInventory.HasValue && daysOfInventory.Value >= ExcessDaysOfInventory)
        {
            return (RecommendedAction.Liquidate, null, null,
                $"{daysOfInventory:F0} days of inventory — excess stock, liquidate to reduce holding costs.");
        }

        // ---- High margin + healthy stock + good velocity: Promote ----
        if (stockHealth == StockHealth.Healthy
            && marginRatio >= HighMarginRatio
            && velocity >= MediumVelocity)
        {
            return (RecommendedAction.Promote, null, null,
                $"High margin ({marginRatio * 100:F0}%) with healthy stock and {velocity:F1}/day velocity — promote aggressively.");
        }

        // ---- Aged inventory with low velocity: Discount ----
        if (ageDays >= AgedProductDays && velocity < LowVelocity)
        {
            var discount = CalculateDiscount(marginRatio, ageDays);
            return (RecommendedAction.Discount, discount, null,
                $"Aged {ageDays} days with low velocity ({velocity:F1}/day) — offer {discount:F0}% discount to move inventory.");
        }

        // ---- Overstock with moderate velocity: Discount ----
        if (stockHealth == StockHealth.Overstock && velocity >= MediumVelocity && marginRatio >= MediumMarginRatio)
        {
            var discount = CalculateDiscount(marginRatio, ageDays);
            return (RecommendedAction.Discount, discount, null,
                $"Overstock ({stock}) with moderate velocity — offer {discount:F0}% discount to accelerate sell-through.");
        }

        // ---- Low margin with healthy stock: Discount to drive volume ----
        if (marginRatio < LowMarginRatio && stockHealth == StockHealth.Healthy && velocity < MediumVelocity)
        {
            return (RecommendedAction.Discount, MinDiscountPercent, null,
                $"Low margin ({marginRatio * 100:F0}%) with slow velocity — light {MinDiscountPercent:F0}% discount to boost volume.");
        }

        // ---- Low stock with low velocity: Hold (monitor) ----
        if (stockHealth == StockHealth.Low && velocity < MediumVelocity)
        {
            return (RecommendedAction.Hold, null, null,
                $"Low stock ({stock}) but slow velocity ({velocity:F1}/day) — hold and monitor.");
        }

        // ---- Default: Hold ----
        return (RecommendedAction.Hold, null, null,
            $"Stock {stock}, velocity {velocity:F1}/day, margin {marginRatio * 100:F0}% — healthy equilibrium, hold position.");
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

    private static InventoryRisk DetermineInventoryRisk(
        StockHealth stockHealth, double velocity, double? daysOfInventory)
    {
        if (stockHealth == StockHealth.OutOfStock)
            return InventoryRisk.Critical;

        if (stockHealth == StockHealth.Low && velocity >= HighVelocity)
            return InventoryRisk.High;

        if (stockHealth == StockHealth.Overstock && velocity < MediumVelocity)
            return InventoryRisk.High;

        if (daysOfInventory.HasValue && daysOfInventory.Value <= CriticalLowDaysOfInventory)
            return InventoryRisk.High;

        if (stockHealth == StockHealth.Low || stockHealth == StockHealth.Overstock)
            return InventoryRisk.Medium;

        if (daysOfInventory.HasValue && daysOfInventory.Value <= LowDaysOfInventory)
            return InventoryRisk.Medium;

        if (daysOfInventory.HasValue && daysOfInventory.Value >= HighDaysOfInventory)
            return InventoryRisk.Medium;

        return velocity < LowVelocity ? InventoryRisk.Medium : InventoryRisk.Low;
    }

    // -------------------------------------------------------------------
    // Discount calculation
    // -------------------------------------------------------------------

    private static double CalculateDiscount(double marginRatio, int ageDays)
    {
        // Base discount: higher for aged inventory, capped by margin
        var baseDiscount = ageDays >= AgedProductDays
            ? MaxDiscountPercent
            : MinDiscountPercent + (ageDays - MatureProductDays) / (double)(AgedProductDays - MatureProductDays) * (MaxDiscountPercent - MinDiscountPercent);

        // Cap discount at 70% of margin to avoid losses
        var maxAllowedDiscount = marginRatio * 100.0 * 0.70;
        var discount = Math.Min(baseDiscount, maxAllowedDiscount);

        return Math.Clamp(Math.Round(discount), MinDiscountPercent, MaxDiscountPercent);
    }

    // -------------------------------------------------------------------
    // Restock quantity calculation
    // -------------------------------------------------------------------

    private static int CalculateRestockQuantity(double velocity, int ageDays)
    {
        // Target 60 days of inventory for established products, 30 for new
        var targetDays = ageDays >= NewProductDays ? 60 : 30;
        var targetStock = (int)Math.Ceiling(velocity * targetDays);

        // Minimum restock of 15 units for slow-moving products
        return Math.Max(targetStock, 15);
    }

    // -------------------------------------------------------------------
    // Shared domain helpers
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
