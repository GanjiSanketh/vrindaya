namespace Vrindaya.Api.AI.Content.DTOs;

/// <summary>
/// Response contract produced by AI content generation — the generated content
/// for a single piece: the primary copy, supporting assets and an engagement
/// estimate.
/// </summary>
public class ContentGenerationResponse
{
    /// <summary>Headline/title of the generated content.</summary>
    public string Title { get; set; } = string.Empty;

    /// <summary>Primary caption copy for the content.</summary>
    public string Caption { get; set; } = string.Empty;

    /// <summary>Relevant hashtags for the content.</summary>
    public List<string> Hashtags { get; set; } = new();

    /// <summary>Call-to-action copy for the content.</summary>
    public string CallToAction { get; set; } = string.Empty;

    /// <summary>Prompt used to generate the accompanying image.</summary>
    public string ImagePrompt { get; set; } = string.Empty;

    /// <summary>Short-form video script for the content.</summary>
    public string ReelScript { get; set; } = string.Empty;

    /// <summary>Ordered carousel slide copy for the content.</summary>
    public List<string> CarouselSlides { get; set; } = new();

    /// <summary>Estimated engagement for the generated content.</summary>
    public double EstimatedEngagement { get; set; }
}