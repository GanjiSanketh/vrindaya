using System.Text.Json.Serialization;

namespace Vrindaya.Api.AI.ContentGeneration.Models;

/// <summary>
/// Physical format a generated content piece is produced for.
/// </summary>
[JsonConverter(typeof(JsonStringEnumConverter))]
public enum ContentType
{
    Post,
    Reel,
    Carousel,
    Story,
    Short,
    Graphic,
    Email,
    Blog,
}