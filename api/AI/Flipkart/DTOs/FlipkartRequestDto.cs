using Vrindaya.Api.AI.Flipkart.Models;

namespace Vrindaya.Api.AI.Flipkart.DTOs;

/// <summary>
/// Input payload for the Flipkart AI Assistant. Carries the product pool and
/// optional configuration for generating Flipkart-specific insights.
/// </summary>
public sealed class FlipkartRequestDto
{
    /// <summary>Products to analyze for Flipkart optimization.</summary>
    public List<FlipkartProduct> Products { get; set; } = [];

    /// <summary>Type of Flipkart assistance requested.</summary>
    public FlipkartAssistanceType AssistanceType { get; set; } = FlipkartAssistanceType.ListingOptimization;

    /// <summary>Maximum number of suggestions to return.</summary>
    public int MaxSuggestions { get; set; } = 10;

    /// <summary>Target Flipkart category for context-aware suggestions.</summary>
    public string? TargetCategory { get; set; }

    /// <summary>Whether to include competitive pricing analysis.</summary>
    public bool IncludePricingAnalysis { get; set; } = true;

    /// <summary>Whether to include catalog compliance checks.</summary>
    public bool IncludeComplianceChecks { get; set; } = true;

    /// <summary>Whether to include keyword/SEO suggestions.</summary>
    public bool IncludeKeywordSuggestions { get; set; } = true;
}

/// <summary>
/// Types of assistance the Flipkart AI can provide.
/// </summary>
public enum FlipkartAssistanceType
{
    /// <summary>Optimize product listings for Flipkart (titles, descriptions, attributes).</summary>
    ListingOptimization,

    /// <summary>Analyze and suggest competitive pricing.</summary>
    PricingAnalysis,

    /// <summary>Check catalog compliance with Flipkart guidelines.</summary>
    ComplianceCheck,

    /// <summary>Generate SEO keywords and search terms for Flipkart.</summary>
    KeywordResearch,

    /// <summary>Analyze competitor listings and positioning.</summary>
    CompetitorAnalysis,

    /// <summary>Full audit covering all assistance types.</summary>
    FullAudit,
}