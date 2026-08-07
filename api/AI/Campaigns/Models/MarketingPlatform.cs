using System.Text.Json.Serialization;

namespace Vrindaya.Api.AI.Campaigns.Models;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum MarketingPlatform
{
    Instagram,
    Facebook,
    Website,
    Flipkart,
    WhatsApp,
    Email,
    MultiPlatform,
}