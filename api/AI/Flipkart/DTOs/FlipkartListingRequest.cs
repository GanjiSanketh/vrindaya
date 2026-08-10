namespace Vrindaya.Api.AI.Flipkart.DTOs;

/// <summary>
/// Request payload for generating a complete Flipkart product listing —
/// title, description, key features, search keywords, and SEO metadata
/// from structured product attributes. Deterministic, no AI calls.
/// </summary>
public sealed class FlipkartListingRequest
{
    /// <summary>Primary product name to feature in the listing title and description.</summary>
    public string ProductName { get; set; } = string.Empty;

    /// <summary>Brand of the product (appears first in the Flipkart title format).</summary>
    public string Brand { get; set; } = string.Empty;

    /// <summary>Flipkart category path for the product.</summary>
    public string Category { get; set; } = string.Empty;

    /// <summary>Fabric or material composition of the product.</summary>
    public string Fabric { get; set; } = string.Empty;

    /// <summary>Primary color of the product.</summary>
    public string Color { get; set; } = string.Empty;

    /// <summary>Pattern of the product (e.g. Solid, Printed, Embroidered).</summary>
    public string Pattern { get; set; } = string.Empty;

    /// <summary>Sleeve style (e.g. Full, Half, Sleeveless, Cap).</summary>
    public string Sleeve { get; set; } = string.Empty;

    /// <summary>Fit type (e.g. Regular, Slim, Relaxed).</summary>
    public string Fit { get; set; } = string.Empty;

    /// <summary>Neckline style (e.g. Round, V-Neck, Collar).</summary>
    public string Neck { get; set; } = string.Empty;

    /// <summary>Occasion suitability (e.g. Casual, Formal, Party, Daily).</summary>
    public string Occasion { get; set; } = string.Empty;

    /// <summary>Number of pieces in the pack (e.g. 1 for single, 2 for couple).</summary>
    public int PackOf { get; set; } = 1;

    /// <summary>Key product features and USP bullet points.</summary>
    public List<string> Features { get; set; } = [];

    /// <summary>Search keywords to embed in the listing for discoverability.</summary>
    public List<string> Keywords { get; set; } = [];
}
