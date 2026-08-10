namespace Vrindaya.Api.AI.Flipkart.DTOs;

/// <summary>
/// Response from the Flipkart AI Assistant containing generated suggestions.
/// </summary>
public sealed class FlipkartResponseDto
{
    /// <summary>Type of assistance that was requested.</summary>
    public FlipkartAssistanceType AssistanceType { get; set; }

    /// <summary>Total number of suggestions generated.</summary>
    public int TotalSuggestions { get; set; }

    /// <summary>Generated Flipkart-specific suggestions.</summary>
    public List<FlipkartSuggestionDto> Suggestions { get; set; } = [];

    /// <summary>Summary of the analysis performed.</summary>
    public string Summary { get; set; } = string.Empty;

    /// <summary>Overall confidence score (0-100) for the suggestions.</summary>
    public int ConfidenceScore { get; set; }

    /// <summary>Timestamp when the response was generated.</summary>
    public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// Individual Flipkart optimization suggestion.
/// </summary>
public sealed class FlipkartSuggestionDto
{
    /// <summary>Unique identifier for this suggestion.</summary>
    public string Id { get; set; } = Guid.NewGuid().ToString("N")[..12];

    /// <summary>Type of this suggestion.</summary>
    public FlipkartSuggestionType Type { get; set; }

    /// <summary>Priority of this suggestion.</summary>
    public FlipkartSuggestionPriority Priority { get; set; }

    /// <summary>Product this suggestion applies to (if product-specific).</summary>
    public string? ProductId { get; set; }

    /// <summary>Product name for context.</summary>
    public string? ProductName { get; set; }

    /// <summary>Title/headline of the suggestion.</summary>
    public string Title { get; set; } = string.Empty;

    /// <summary>Detailed description of the suggestion.</summary>
    public string Description { get; set; } = string.Empty;

    /// <summary>Specific action items to implement this suggestion.</summary>
    public List<string> ActionItems { get; set; } = [];

    /// <summary>Expected impact of implementing this suggestion.</summary>
    public string ExpectedImpact { get; set; } = string.Empty;

    /// <summary>Confidence score for this specific suggestion (0-100).</summary>
    public int Confidence { get; set; }

    /// <summary>Estimated effort to implement (Low/Medium/High).</summary>
    public string EstimatedEffort { get; set; } = "Medium";

    /// <summary>Before/after comparison data if applicable.</summary>
    public FlipkartComparisonData? Comparison { get; set; }

    /// <summary>Additional metadata for the suggestion.</summary>
    public Dictionary<string, object> Metadata { get; set; } = [];
}

/// <summary>
/// Types of Flipkart suggestions.
/// </summary>
public enum FlipkartSuggestionType
{
    /// <summary>Product title optimization.</summary>
    TitleOptimization,

    /// <summary>Product description enhancement.</summary>
    DescriptionEnhancement,

    /// <summary>Attribute/field completion for catalog compliance.</summary>
    AttributeCompletion,

    /// <summary>Keyword/SEO term recommendations.</summary>
    KeywordRecommendation,

    /// <summary>Pricing adjustment recommendation.</summary>
    PricingAdjustment,

    /// <summary>Image/asset improvement.</summary>
    ImageImprovement,

    /// <summary>Category/mapping correction.</summary>
    CategoryCorrection,

    /// <summary>Compliance issue resolution.</summary>
    ComplianceResolution,

    /// <summary>Competitive positioning improvement.</summary>
    CompetitivePositioning,

    /// <summary>Variant/option optimization.</summary>
    VariantOptimization,
}

/// <summary>
/// Priority levels for Flipkart suggestions.
/// </summary>
public enum FlipkartSuggestionPriority
{
    Critical = 1,
    High = 2,
    Medium = 3,
    Low = 4,
    Informational = 5,
}

/// <summary>
/// Before/after comparison data for suggestions.
/// </summary>
public sealed class FlipkartComparisonData
{
    /// <summary>Current value/state.</summary>
    public string Current { get; set; } = string.Empty;

    /// <summary>Recommended value/state.</summary>
    public string Recommended { get; set; } = string.Empty;

    /// <summary>Field/attribute being compared.</summary>
    public string Field { get; set; } = string.Empty;

    /// <summary>Reason for the change.</summary>
    public string Reason { get; set; } = string.Empty;
}