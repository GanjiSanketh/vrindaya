using Vrindaya.Api.AI.Campaigns.Models;

namespace Vrindaya.Api.AI.Campaigns.Dtos;

/// <summary>
/// Input contract for campaign generation. Pure request data — drives which
/// rules are applied and how campaigns are shaped. No Firestore, no AI.
/// </summary>
public class CampaignRequestDto
{
    public CampaignObjective PreferredObjective { get; set; } = CampaignObjective.IncreaseSales;

    public MarketingPlatform? Platform { get; set; }

    public int MaximumCampaigns { get; set; } = 5;

    public bool IncludeLowStock { get; set; } = true;

    public bool IncludeNewProducts { get; set; } = true;

    public bool IncludeBestSellers { get; set; } = true;

    public string FestivalName { get; set; } = string.Empty;

    public string TargetAudience { get; set; } = "General";

    /// <summary>Optional product id whitelist. When non-empty, only these products are considered.</summary>
    public List<string> ProductIds { get; set; } = new();
}