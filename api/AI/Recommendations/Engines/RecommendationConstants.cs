namespace Vrindaya.Api.AI.Recommendations.Engines;

/// <summary>
/// All tunable knobs for recommendation generation live here — nothing is
/// hard-coded in the engine.
/// </summary>
public static class RecommendationConstants
{
    // ---- Margin ratio tiers ((selling - cost) / selling) ----
    public const double LowMarginRatio = 0.20;
    public const double MediumMarginRatio = 0.35;
    public const double HighMarginRatio = 0.50;

    // ---- Inventory thresholds (units) ----
    public const int LowStockThreshold = 10;
    public const int ExcessStockThreshold = 120;

    // ---- Sales velocity (units per day) ----
    public const double SlowVelocityUnitsPerDay = 2.0;
    public const double MediumVelocityUnitsPerDay = 5.0;
    public const double FastVelocityUnitsPerDay = 8.0;

    // ---- Product age (days since creation) ----
    public const int NewProductAgeDays = 30;
    public const int AgedProductDays = 180;

    // ---- Confidence score range (0..1) ----
    public const double MinConfidence = 0.0;
    public const double MaxConfidence = 1.0;

    // ---- Baseline expected ROI per recommendation type ----
    public const double DiscountExpectedROI = 1.8;
    public const double BundleExpectedROI = 3.2;
    public const double UpsellExpectedROI = 4.5;
    public const double CrossSellExpectedROI = 2.8;
    public const double ClearanceExpectedROI = 1.2;
}
