namespace Vrindaya.Api.AI.Campaigns.Scoring;

/// <summary>
/// All tunable knobs for campaign scoring live here — nothing is hard-coded
/// in the engine. Component weights sum to <see cref="TotalWeight"/> (100).
/// </summary>
public static class CampaignScoringConstants
{
    public const int MinScore = 0;
    public const int MaxScore = 100;

    // ---- Component weights (percent points; must sum to TotalWeight) ----
    public const int ProfitMarginWeight = 25;
    public const int InventoryLevelWeight = 20;
    public const int SalesVelocityWeight = 20;
    public const int ProductAgeWeight = 10;
    public const int SeasonalityWeight = 15;
    public const int StockUrgencyWeight = 10;
    public const int TotalWeight = ProfitMarginWeight
        + InventoryLevelWeight
        + SalesVelocityWeight
        + ProductAgeWeight
        + SeasonalityWeight
        + StockUrgencyWeight;

    // ---- Profit margin tiers ----
    public const double HighMarginRatio = 0.45;
    public const double MediumMarginRatio = 0.30;
    public const int HighMarginScore = 100;
    public const int MediumMarginScore = 70;
    public const int LowMarginScore = 40;

    // ---- Inventory level ----
    public const int TargetStockLevel = 100;
    public const int MaxStockDeviation = 200;
    public const int MinInventoryLevelScore = 20;

    // ---- Sales velocity (units per day) ----
    public const double HighVelocityUnitsPerDay = 10.0;
    public const double MediumVelocityUnitsPerDay = 3.0;
    public const int HighVelocityScore = 100;
    public const int MediumVelocityScore = 70;
    public const int LowVelocityScore = 35;

    // ---- Product age (days since creation) ----
    public const int LaunchAgeDays = 30;
    public const int PrimeAgeDays = 120;
    public const int MatureAgeDays = 365;
    public const int LaunchAgeScore = 100;
    public const int PrimeAgeScore = 85;
    public const int MatureAgeScore = 60;
    public const int AgedAgeScore = 40;

    // ---- Stock urgency tiers (remaining units) ----
    public const int CriticalStockLevel = 5;
    public const int LowStockLevel = 15;
    public const int ModerateStockLevel = 30;
    public const int ElevatedStockLevel = 60;
    public const int CriticalStockScore = 100;
    public const int LowStockScore = 80;
    public const int ModerateStockScore = 50;
    public const int ElevatedStockScore = 20;
    public const int HealthyStockScore = 0;

    // ---- Seasonality ----
    public const int NoSeasonalityScore = 0;
    public const int FullSeasonalityScore = 100;
}