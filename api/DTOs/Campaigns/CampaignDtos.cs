using System.ComponentModel.DataAnnotations;
using Vrindaya.Api.AI.Campaigns.Dtos;

namespace Vrindaya.Api.DTOs.Campaigns
{
    public class CampaignGenerateRequest
    {
        [Required]
        public string PreferredObjective { get; set; } = "Sales";

        public string Platform { get; set; } = "Instagram";

        [Range(1, 100)]
        public int MaximumCampaigns { get; set; } = 5;

        public bool IncludeLowStock { get; set; } = false;

        public bool IncludeNewProducts { get; set; } = true;

        public bool IncludeBestSellers { get; set; } = true;

        public string FestivalName { get; set; } = "Diwali";

        public string TargetAudience { get; set; } = "General";

        public string Tone { get; set; } = "Professional";

        public string Language { get; set; } = "English";

        public List<string> ProductIds { get; set; } = new();
    }

    public class CampaignGenerateResponse
    {
        public List<CampaignSuggestionDto> Campaigns { get; set; } = new();
        public DateTime GeneratedAt { get; set; }
        public string GenerationTime { get; set; }
        public int TotalProductsAnalyzed { get; set; }
        public int TotalCampaigns { get; set; }
    }

    public class CampaignHistoryResponse
    {
        public int TotalCampaigns { get; set; }
        public DateTime GeneratedAt { get; set; }
    }

    public class CampaignDetailResponse
    {
        public DateTime RetrievedAt { get; set; }
    }
}