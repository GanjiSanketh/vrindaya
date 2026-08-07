using System.Text.Json.Serialization;
using Vrindaya.Api.AI.Campaigns.Models;

namespace Vrindaya.Api.AI.Campaigns.Dtos;

/// <summary>
/// A single generated campaign suggestion, with its computed score and
/// priority ordering signal. Score is always populated; higher is better.
/// </summary>
public class CampaignSuggestionDto
{
    public string ProductId { get; set; } = string.Empty;

    public string ProductName { get; set; } = string.Empty;

    public string Category { get; set; } = string.Empty;

    public string Title { get; set; } = string.Empty;

    [JsonConverter(typeof(JsonStringEnumConverter))]
    public CampaignObjective Objective { get; set; }

    public string Rationale { get; set; } = string.Empty;

    /// <summary>0..100 deterministic score used to order suggestions (descending).</summary>
    public int Score { get; set; }

    [JsonConverter(typeof(JsonStringEnumConverter))]
    public CampaignPriority Priority { get; set; }

    public double Confidence { get; set; }

    public double ExpectedRoi { get; set; }

    public long EstimatedRevenue { get; set; }
}