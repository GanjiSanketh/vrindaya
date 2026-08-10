using System.Text.Json.Serialization;
using Vrindaya.Api.AI.ContentGeneration.Models;

namespace Vrindaya.Api.AI.ContentGeneration.DTOs;

/// <summary>
/// A single generated content piece. The engine populates the scoring and
/// targeting fields; the AI provider fills in the rich copy (hook, caption,
/// script, hashtags, CTAs, image prompts, SEO keywords, and so on).
/// </summary>
public class ContentPieceDto
{
    public string ProductId { get; set; } = string.Empty;

    public string ProductName { get; set; } = string.Empty;

    public string Category { get; set; } = string.Empty;

    [JsonConverter(typeof(JsonStringEnumConverter))]
    public ContentType ContentType { get; set; }

    [JsonConverter(typeof(JsonStringEnumConverter))]
    public ContentPlatform? Platform { get; set; }

    [JsonConverter(typeof(JsonStringEnumConverter))]
    public ContentTone Tone { get; set; }

    [JsonConverter(typeof(JsonStringEnumConverter))]
    public ContentPriority Priority { get; set; }

    public string Title { get; set; } = string.Empty;

    /// <summary>Human-readable why behind the score.</summary>
    public string Rationale { get; set; } = string.Empty;

    /// <summary>0..100 deterministic score used to order pieces (descending).</summary>
    public int Score { get; set; }

    /// <summary>Confidence normalized to 0..1.</summary>
    public double Confidence { get; set; }

    public string TargetAudience { get; set; } = string.Empty;

    /// <summary>Opening hook for the piece.</summary>
    public string Hook { get; set; } = string.Empty;

    /// <summary>Primary social/email caption copy.</summary>
    public string Caption { get; set; } = string.Empty;

    /// <summary>Short-form video/audio script for the piece.</summary>
    public string ReelScript { get; set; } = string.Empty;

    public string Cta { get; set; } = string.Empty;

    public string SuggestedMusic { get; set; } = string.Empty;

    public string BestPostingTime { get; set; } = string.Empty;

    /// <summary>Text-to-image prompt for the piece's visual.</summary>
    public string ImagePrompt { get; set; } = string.Empty;

    public string ImageNegativePrompt { get; set; } = string.Empty;

    /// <summary>Ordered carousel/newsletter slide copy for the piece.</summary>
    public List<string> CarouselSlides { get; set; } = new();

    public List<string> Hashtags { get; set; } = new();

    public List<string> EngagementTips { get; set; } = new();

    public List<string> SeoKeywords { get; set; } = new();
}