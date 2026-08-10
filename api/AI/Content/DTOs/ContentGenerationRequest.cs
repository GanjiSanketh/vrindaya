using System.Text.Json.Serialization;
using Vrindaya.Api.AI.Campaigns.Models;
using Vrindaya.Api.AI.ContentGeneration.Models;

namespace Vrindaya.Api.AI.Content.DTOs;

/// <summary>
/// Request contract for AI content generation — the parameters that shape the
/// generated marketing content (objective, audience, tone, platform, product
/// pool, and business context). Pure request data, no Firestore, no AI.
/// </summary>
public class ContentGenerationRequest
{
    /// <summary>The marketing objective the generated content should serve.</summary>
    [JsonConverter(typeof(JsonStringEnumConverter))]
    public CampaignObjective CampaignObjective { get; set; } = CampaignObjective.IncreaseSales;

    /// <summary>Audience segment the generated content should speak to.</summary>
    public string TargetAudience { get; set; } = "General";

    /// <summary>Voice/register applied to the generated content.</summary>
    [JsonConverter(typeof(JsonStringEnumConverter))]
    public ContentTone Tone { get; set; } = ContentTone.Professional;

    /// <summary>Distribution channel the content targets.</summary>
    [JsonConverter(typeof(JsonStringEnumConverter))]
    public ContentPlatform Platform { get; set; } = ContentPlatform.Instagram;

    /// <summary>Language the content should be written in.</summary>
    public string Language { get; set; } = "English";

    /// <summary>Product pool the generated content can reference.</summary>
    public List<CampaignProduct> Products { get; set; } = new();

    /// <summary>High-level business goal behind this content run.</summary>
    public string BusinessGoal { get; set; } = string.Empty;

    /// <summary>Seasonal context (e.g. "Monsoon", "Winter").</summary>
    public string Season { get; set; } = string.Empty;

    /// <summary>Festival context (e.g. "Diwali", "Eid").</summary>
    public string Festival { get; set; } = string.Empty;

    /// <summary>Budget available for the content campaign.</summary>
    public decimal Budget { get; set; }

    /// <summary>Free-form description of the expected outcome.</summary>
    public string ExpectedOutput { get; set; } = string.Empty;
}