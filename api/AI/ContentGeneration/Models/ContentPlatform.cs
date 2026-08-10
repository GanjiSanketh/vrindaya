using System.Text.Json.Serialization;

namespace Vrindaya.Api.AI.ContentGeneration.Models;

/// <summary>
/// Distribution channel a generated content piece targets.
/// </summary>
[JsonConverter(typeof(JsonStringEnumConverter))]
public enum ContentPlatform
{
    Instagram,
    Facebook,
    WhatsApp,
    YouTube,
    Pinterest,
    Email,
    Website,
}