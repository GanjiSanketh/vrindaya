using System.Text.Json.Serialization;

namespace Vrindaya.Api.AI.Recommendations.Models;

/// <summary>
/// Product-level recommendation categories produced by the
/// recommendation engine.
/// </summary>
[JsonConverter(typeof(JsonStringEnumConverter))]
public enum RecommendationType
{
    Discount,
    Bundle,
    Upsell,
    CrossSell,
    Clearance,
}
