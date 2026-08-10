using Vrindaya.Api.AI.Campaigns.Models;
using Vrindaya.Api.AI.ContentGeneration.Models;

namespace Vrindaya.Api.AI.ContentGeneration.DTOs;

/// <summary>
/// Input contract for content generation. Products are ranked deterministically
/// and shaped into the requested format. Pure request data — no Firestore, no AI.
/// </summary>
public class ContentGenerationRequestDto
{
    /// <summary>The product pool the content engine draws pieces from.</summary>
    public List<CampaignProduct> Products { get; set; } = new();

    /// <summary>Physical format to produce (post, reel, carousel, etc.).</summary>
    public ContentType ContentType { get; set; } = ContentType.Post;

    /// <summary>Optional distribution channel. When null, the provider picks a sensible default for the format.</summary>
    public ContentPlatform? Platform { get; set; }

    /// <summary>Voice applied to every generated piece.</summary>
    public ContentTone Tone { get; set; } = ContentTone.Professional;

    /// <summary>Maximum number of content pieces returned. Clamped to the service limit.</summary>
    public int MaximumPieces { get; set; } = 5;

    /// <summary>Audience segment the copy should speak to.</summary>
    public string TargetAudience { get; set; } = "General";

    /// <summary>Optional festival/season hook injected into copy and seasonality scoring.</summary>
    public string FestivalName { get; set; } = string.Empty;

    /// <summary>Optional product id whitelist. When non-empty, only these products are considered.</summary>
    public List<string> ProductIds { get; set; } = new();
}