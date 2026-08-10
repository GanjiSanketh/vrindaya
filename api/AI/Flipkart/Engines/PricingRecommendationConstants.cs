namespace Vrindaya.Api.AI.Flipkart.Engines;

/// <summary>
/// All tunable knobs for pricing recommendations live here — nothing is
/// hard-coded in the engine. Thresholds define margin tiers, safe pricing
/// bounds and competitive positioning.
/// </summary>
public static class PricingRecommendationConstants
{
    // ---- Margin tiers (ratio, not percentage) ----
    public const double HighMarginRatio = 0.50;
    public const double HealthyMarginRatio = 0.35;
    public const double MinimumMarginRatio = 0.20;
    public const double LowMarginRatio = 0.10;

    // ---- Competitive positioning ----
    public const double CompetitiveDiscountRatio = 0.95; // 5% below market
    public const double PremiumMarkupRatio = 1.10; // 10% above base

    // ---- Price bounds ----
    public const double MinPriceMarkupRatio = 1.05; // at least 5% above cost
    public const double MaxPriceMarkupRatio = 2.50; // at most 150% above cost

    // ---- Expected profit projection (days) ----
    public const int ProjectionDays = 30;

    // ---- Flipkart commission handling ----
    public const double DefaultCommissionRate = 0.15; // 15% default
    public const double MinCommissionRate = 0.05;
    public const double MaxCommissionRate = 0.30;
}
