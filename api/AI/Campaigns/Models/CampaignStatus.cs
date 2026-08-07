using System.Text.Json.Serialization;

namespace Vrindaya.Api.AI.Campaigns.Models;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum CampaignStatus
{
    Draft,
    Generated,
    Approved,
    Scheduled,
    Published,
    Completed,
    Cancelled,
}