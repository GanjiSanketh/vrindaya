using System.Text.Json.Serialization;

namespace Vrindaya.Api.AI.ContentGeneration.Models;

/// <summary>
/// Voice and register applied to a generated content piece.
/// </summary>
[JsonConverter(typeof(JsonStringEnumConverter))]
public enum ContentTone
{
    Professional,
    Casual,
    Festive,
    Urgent,
    Premium,
    Storytelling,
}