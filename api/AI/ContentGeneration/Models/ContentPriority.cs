using System.Text.Json.Serialization;

namespace Vrindaya.Api.AI.ContentGeneration.Models;

/// <summary>
/// Publishing priority for a content piece, derived from its computed score.
/// </summary>
[JsonConverter(typeof(JsonStringEnumConverter))]
public enum ContentPriority
{
    Critical,
    High,
    Medium,
    Low,
}