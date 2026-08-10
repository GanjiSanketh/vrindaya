namespace Vrindaya.Api.AI.Flipkart.DTOs;

/// <summary>
/// Response containing a complete, Flipkart-compliant product listing
/// generated from structured product attributes. Deterministic, no AI calls.
/// </summary>
public sealed class FlipkartListingResponse
{
    /// <summary>Flipkart-optimized product title (Brand + Product Type + Attributes + Size/Color).</summary>
    public string Title { get; set; } = string.Empty;

    /// <summary>Detailed product description with features, fabric, care, and usage info.</summary>
    public string Description { get; set; } = string.Empty;

    /// <summary>Ordered key feature bullet points for the listing.</summary>
    public List<string> KeyFeatures { get; set; } = [];

    /// <summary>Backend search keywords for Flipkart SEO.</summary>
    public List<string> SearchKeywords { get; set; } = [];

    /// <summary>SEO-optimized meta title for the listing page.</summary>
    public string MetaTitle { get; set; } = string.Empty;

    /// <summary>SEO-optimized meta description for the listing page.</summary>
    public string MetaDescription { get; set; } = string.Empty;

    /// <summary>AI video-generation prompt (camera, lighting, model, product focus, duration, Flipkart compliance).</summary>
    public string VideoPrompt { get; set; } = string.Empty;
}
