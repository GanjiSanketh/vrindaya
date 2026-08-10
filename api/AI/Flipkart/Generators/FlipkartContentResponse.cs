namespace Vrindaya.Api.AI.Flipkart.Generators;

/// <summary>
/// A complete set of Flipkart listing content. The copy fields are written by
/// the configured AI provider through the core orchestrator; the title, search
/// tags, packaging notes and video prompt are derived deterministically from the
/// supplied product attributes.
/// </summary>
public sealed class FlipkartContentResponse
{
    /// <summary>Flipkart-optimized listing title (Brand + Product + Attributes).</summary>
    public string Title { get; set; } = string.Empty;

    /// <summary>Detailed product description (300–500 words), written by the AI provider.</summary>
    public string Description { get; set; } = string.Empty;

    /// <summary>Ordered key feature bullet points for the listing.</summary>
    public List<string> BulletFeatures { get; set; } = [];

    /// <summary>Comma-separated backend search keywords for Flipkart discoverability.</summary>
    public string BackendSearchKeywords { get; set; } = string.Empty;

    /// <summary>SEO-optimized meta title for the listing page (max 60 chars).</summary>
    public string MetaTitle { get; set; } = string.Empty;

    /// <summary>SEO-optimized meta description for the listing page (max 160 chars).</summary>
    public string MetaDescription { get; set; } = string.Empty;

    /// <summary>Accessible alt text describing the product hero image for screen readers and SEO.</summary>
    public string ImageAltText { get; set; } = string.Empty;

    /// <summary>Short, punchy product highlight statements for badges and banners.</summary>
    public List<string> ProductHighlights { get; set; } = [];

    /// <summary>Lifestyle-focused, benefit-driven description copy for gallery banners.</summary>
    public string LifestyleDescription { get; set; } = string.Empty;

    /// <summary>Flipkart search tags (kebab-case) for enhanced browse discoverability.</summary>
    public List<string> FlipkartSearchTags { get; set; } = [];

    /// <summary>Packaging and care notes shown in the product details section.</summary>
    public string PackagingNotes { get; set; } = string.Empty;

    /// <summary>AI video-generation prompt (camera, lighting, model, product focus, duration, Flipkart compliance).</summary>
    public string VideoPrompt { get; set; } = string.Empty;
}
