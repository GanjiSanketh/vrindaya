namespace Vrindaya.Api.AI.Flipkart.Engines;

/// <summary>
/// All tunable knobs for listing quality scoring live here — nothing is
/// hard-coded in the engine. Component weights sum to <see cref="TotalWeight"/>
/// (100) so the <see cref="ListingQualityEngine"/> overall score is always
/// on a 0–100 scale.
/// </summary>
public static class ListingQualityConstants
{
    public const int MaxScore = 100;
    public const int MinScore = 0;

    // ---- Title quality thresholds ----
    public const int MinTitleChars = 20;
    public const int IdealTitleMinChars = 40;
    public const int IdealTitleMaxChars = 80;
    public const int MaxTitleChars = 120;

    // ---- Description quality thresholds ----
    public const int MinDescriptionWords = 50;
    public const int IdealDescriptionMinWords = 150;
    public const int IdealDescriptionMaxWords = 500;
    public const int MaxDescriptionWords = 800;
    public const double IdealMaxSentenceLength = 25.0;

    // ---- Bullet point thresholds ----
    public const int MinBulletPoints = 3;
    public const int IdealMinBulletPoints = 5;
    public const int MaxBulletPointLength = 120;

    // ---- Image count thresholds ----
    public const int MinImages = 3;
    public const int IdealMinImages = 5;
    public const int MaxImages = 10;

    // ---- SEO keyword thresholds ----
    public const int MinSeoKeywords = 5;
    public const int IdealMinSeoKeywords = 8;
    public const int MaxSeoKeywords = 15;
    public const double IdealKeywordDensityPercent = 3.0;
    public const double MaxKeywordDensityPercent = 5.0;

    // ---- Attribute completeness ----
    public const int MinAttributeCompleteness = 50; // percentage

    // ---- Overall score component weights (must sum to TotalWeight) ----
    public const int TitleQualityWeight = 20;
    public const int DescriptionQualityWeight = 20;
    public const int BulletPointsWeight = 15;
    public const int ImageCountWeight = 10;
    public const int SeoKeywordsWeight = 15;
    public const int BrandConsistencyWeight = 10;
    public const int AttributeCompletenessWeight = 10;
    public const int TotalWeight = TitleQualityWeight
        + DescriptionQualityWeight
        + BulletPointsWeight
        + ImageCountWeight
        + SeoKeywordsWeight
        + BrandConsistencyWeight
        + AttributeCompletenessWeight;
}
