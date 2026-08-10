namespace Vrindaya.Api.AI.Flipkart.DTOs;

/// <summary>
/// Input for listing quality evaluation — captures the current state of a
/// Flipkart listing across all scorable dimensions. Deterministic, no AI calls.
/// </summary>
public sealed class ListingEvaluationInput
{
    /// <summary>Product identifier.</summary>
    public string ProductId { get; set; } = string.Empty;

    /// <summary>Product name.</summary>
    public string ProductName { get; set; } = string.Empty;

    /// <summary>Brand name.</summary>
    public string Brand { get; set; } = string.Empty;

    /// <summary>Product category.</summary>
    public string Category { get; set; } = string.Empty;

    /// <summary>Listing title.</summary>
    public string Title { get; set; } = string.Empty;

    /// <summary>Listing description.</summary>
    public string Description { get; set; } = string.Empty;

    /// <summary>Bullet points / key features.</summary>
    public List<string> BulletPoints { get; set; } = [];

    /// <summary>Number of product images uploaded.</summary>
    public int ImageCount { get; set; }

    /// <summary>SEO keywords used in the listing.</summary>
    public List<string> SeoKeywords { get; set; } = [];

    /// <summary>Product attributes (e.g. Color, Size, Fabric, Fit).</summary>
    public Dictionary<string, string> Attributes { get; set; } = [];
}
