namespace Vrindaya.Api.AI.Flipkart.Engines;

/// <summary>
/// All tunable knobs for product intelligence analysis live here — nothing
/// is hard-coded in the engine. Component weights sum to <see cref="TotalWeight"/>
/// (100) so the <see cref="ProductIntelligenceEngine"/> overall score is always
/// on a 0–100 scale.
/// </summary>
public static class ProductIntelligenceConstants
{
    public const int MaxScore = 100;
    public const int MinScore = 0;

    // ---- Stock thresholds (units) ----
    public const int LowStockThreshold = 15;
    public const int HealthyStockCeiling = 100;

    // ---- Margin ratio tiers ((selling - cost) / selling) ----
    public const double HighMarginRatio = 0.45;
    public const double MediumMarginRatio = 0.30;
    public const double LowMarginRatio = 0.15;

    // ---- Sales velocity tiers (units per day) ----
    public const double HighVelocityUnitsPerDay = 10.0;
    public const double MediumVelocityUnitsPerDay = 3.0;
    public const double LowVelocityUnitsPerDay = 1.0;

    // ---- Product age tiers (days since creation) ----
    public const int LaunchAgeDays = 30;
    public const int PrimeAgeDays = 120;
    public const int MatureAgeDays = 365;

    // ---- Overall score component weights (must sum to TotalWeight) ----
    public const int MarginQualityWeight = 25;
    public const int StockHealthWeight = 20;
    public const int SalesVelocityWeight = 25;
    public const int SalesVolumeWeight = 15;
    public const int ProductAgeWeight = 10;
    public const int RiskMitigationWeight = 5;
    public const int TotalWeight = MarginQualityWeight
        + StockHealthWeight
        + SalesVelocityWeight
        + SalesVolumeWeight
        + ProductAgeWeight
        + RiskMitigationWeight;
}
