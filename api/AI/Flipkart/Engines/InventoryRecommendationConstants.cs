namespace Vrindaya.Api.AI.Flipkart.Engines;

/// <summary>
/// All tunable knobs for inventory recommendations live here — nothing is
/// hard-coded in the engine. Thresholds define stock bands, velocity tiers,
/// age brackets and margin boundaries.
/// </summary>
public static class InventoryRecommendationConstants
{
    // ---- Stock thresholds (units) ----
    public const int CriticalLowStock = 5;
    public const int LowStockThreshold = 15;
    public const int HealthyStockCeiling = 100;
    public const int OverstockThreshold = 150;

    // ---- Sales velocity tiers (units per day) ----
    public const double HighVelocity = 10.0;
    public const double MediumVelocity = 3.0;
    public const double LowVelocity = 1.0;

    // ---- Inventory age brackets (days) ----
    public const int NewProductDays = 30;
    public const int MatureProductDays = 180;
    public const int AgedProductDays = 365;

    // ---- Margin ratio tiers ----
    public const double HighMarginRatio = 0.45;
    public const double MediumMarginRatio = 0.30;
    public const double LowMarginRatio = 0.15;

    // ---- Days of inventory thresholds ----
    public const double CriticalLowDaysOfInventory = 7.0;
    public const double LowDaysOfInventory = 14.0;
    public const double HighDaysOfInventory = 60.0;
    public const double ExcessDaysOfInventory = 90.0;

    // ---- Discount suggestion bounds ----
    public const double MinDiscountPercent = 10.0;
    public const double MaxDiscountPercent = 30.0;
}
