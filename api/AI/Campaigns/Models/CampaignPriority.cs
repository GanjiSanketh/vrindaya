using System.Text.Json.Serialization;

namespace Vrindaya.Api.AI.Campaigns.Models;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum CampaignPriority
{
    Low,
    Medium,
    High,
    Critical,
}