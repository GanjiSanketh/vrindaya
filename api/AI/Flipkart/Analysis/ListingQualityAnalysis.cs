namespace Vrindaya.Api.AI.Flipkart.Analysis;

/// <summary>
/// Severity of a quality improvement suggestion.
/// </summary>
public enum QualitySeverity
{
    Low = 0,
    Medium = 1,
    High = 2,
}

/// <summary>
/// A single improvement recommendation tied to a quality dimension.
/// </summary>
public sealed record QualitySuggestion(
    string Category,
    string Message,
    QualitySeverity Severity);

/// <summary>
/// Result of analyzing a generated Flipkart listing — five heuristic scores
/// (each 0–100), an overall average, and actionable improvement suggestions.
/// Produced deterministically from the listing request + response; no AI calls.
/// </summary>
public sealed class ListingQualityAnalysis
{
    /// <summary>Overall average score across all five dimensions (0–100, 1 decimal).</summary>
    public double OverallScore { get; set; }

    /// <summary>Title/keyword/meta-title/meta-description health (0–100).</summary>
    public int SeoScore { get; set; }

    /// <summary>Description + feature-bullet readability (0–100).</summary>
    public int ReadabilityScore { get; set; }

    /// <summary>Keyword coverage and density balance (0–100).</summary>
    public int KeywordDensityScore { get; set; }

    /// <summary>Benefit-driven, conversion-friendly language (0–100).</summary>
    public int CustomerAppealScore { get; set; }

    /// <summary>Flipkart-specific format and SEO compliance (0–100).</summary>
    public int FlipkartOptimizationScore { get; set; }

    /// <summary>Ordered improvement recommendations.</summary>
    public List<QualitySuggestion> Suggestions { get; set; } = [];
}
