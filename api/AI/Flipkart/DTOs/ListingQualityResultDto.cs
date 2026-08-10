using Vrindaya.Api.AI.Flipkart.Analysis;

namespace Vrindaya.Api.AI.Flipkart.DTOs;

/// <summary>
/// Result of evaluating a listing's quality — overall score (0–100),
/// per-dimension scores (0–100 each), and actionable improvement suggestions.
/// Deterministic, no AI calls.
/// </summary>
public sealed class ListingQualityResultDto
{
    /// <summary>Overall weighted quality score (0–100).</summary>
    public int OverallScore { get; set; }

    /// <summary>Title quality score (0–100).</summary>
    public int TitleScore { get; set; }

    /// <summary>Description quality score (0–100).</summary>
    public int DescriptionScore { get; set; }

    /// <summary>Bullet points quality score (0–100).</summary>
    public int BulletPointsScore { get; set; }

    /// <summary>Image count adequacy score (0–100).</summary>
    public int ImageCountScore { get; set; }

    /// <summary>SEO keyword optimization score (0–100).</summary>
    public int SeoKeywordsScore { get; set; }

    /// <summary>Brand consistency score (0–100).</summary>
    public int BrandConsistencyScore { get; set; }

    /// <summary>Attribute completeness score (0–100).</summary>
    public int AttributeCompletenessScore { get; set; }

    /// <summary>Ordered improvement recommendations (highest severity first).</summary>
    public List<QualitySuggestion> Suggestions { get; set; } = [];
}
