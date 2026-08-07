namespace Vrindaya.Api.AI.Campaigns.Dtos;

/// <summary>
/// Output contract for campaign generation — the ordered list of suggestions
/// plus aggregate generation metadata.
/// </summary>
public class CampaignResponseDto
{
    /// <summary>Suggestions ordered by Score descending.</summary>
    public List<CampaignSuggestionDto> Campaigns { get; set; } = new();

    public DateTime GeneratedAt { get; set; }

    public int TotalProductsAnalyzed { get; set; }

    public int TotalCampaigns { get; set; }
}