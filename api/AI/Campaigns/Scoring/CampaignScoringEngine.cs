using Vrindaya.Api.AI.Campaigns.Models;
using static Vrindaya.Api.AI.Campaigns.Scoring.CampaignScoringConstants;

namespace Vrindaya.Api.AI.Campaigns.Scoring;

/// <summary>
/// Default <see cref="ICampaignScoringEngine"/>. Each of the six factors is
/// scored 0..100 and combined with its configured weight. Fully deterministic
/// — no randomness, no wall-clock dependence beyond the product's own dates.
/// </summary>
public class CampaignScoringEngine : ICampaignScoringEngine
{
    public int Score(CampaignProduct product, int seasonalityScore)
    {
        var marginScore = ScoreProfitMargin(product);
        var inventoryScore = ScoreInventoryLevel(product);
        var velocityScore = ScoreSalesVelocity(product);
        var ageScore = ScoreProductAge(product);
        var seasonalScore = ClampSeasonality(seasonalityScore);
        var urgencyScore = ScoreStockUrgency(product);

        var weighted = 
            (marginScore * ProfitMarginWeight)
            + (inventoryScore * InventoryLevelWeight)
            + (velocityScore * SalesVelocityWeight)
            + (ageScore * ProductAgeWeight)
            + (seasonalScore * SeasonalityWeight)
            + (urgencyScore * StockUrgencyWeight);

        var total = weighted / (double)TotalWeight;
        return (int)Math.Clamp(total, MinScore, MaxScore);
    }

    private static int ScoreProfitMargin(CampaignProduct product)
    {
        var margin = product.SellingPrice > 0
            ? (product.SellingPrice - product.PurchaseCost) / product.SellingPrice
            : 0.0;

        return margin >= HighMarginRatio
            ? HighMarginScore
            : margin >= MediumMarginRatio
                ? MediumMarginScore
                : LowMarginScore;
    }

    private static int ScoreInventoryLevel(CampaignProduct product)
    {
        var deviation = System.Math.Abs(product.Stock - TargetStockLevel);
        var normalized = deviation / (double)MaxStockDeviation;
        var score = MinInventoryLevelScore + (int)((MaxScore - MinInventoryLevelScore) * (1 - normalized));
        return Clamp(score);
    }

    private static int ScoreSalesVelocity(CampaignProduct product)
    {
        var ageDays = (DateTime.UtcNow - product.CreatedDate).TotalDays;
        var velocity = ageDays > 0 ? product.Sales / ageDays : 0;

        if (velocity >= HighVelocityUnitsPerDay)
            return HighVelocityScore;
        if (velocity >= MediumVelocityUnitsPerDay)
            return MediumVelocityScore;
        return LowVelocityScore;
    }

    private static int ScoreProductAge(CampaignProduct product)
    {
        var ageDays = (DateTime.UtcNow.Date - product.CreatedDate.Date).Days;

        if (ageDays <= LaunchAgeDays)
            return LaunchAgeScore;
        if (ageDays <= PrimeAgeDays)
            return PrimeAgeScore;
        if (ageDays <= MatureAgeDays)
            return MatureAgeScore;
        return AgedAgeScore;
    }

    private static int ScoreStockUrgency(CampaignProduct product)
    {
        if (product.Stock <= CriticalStockLevel)
            return CriticalStockScore;
        if (product.Stock <= LowStockLevel)
            return LowStockScore;
        if (product.Stock <= ModerateStockLevel)
            return ModerateStockScore;
        if (product.Stock <= ElevatedStockLevel)
            return ElevatedStockScore;
        return HealthyStockScore;
    }

    private static int ClampSeasonality(int score) => Math.Clamp(score, MinScore, MaxScore);

    private static int Clamp(int score) => Math.Clamp(score, MinScore, MaxScore);
}