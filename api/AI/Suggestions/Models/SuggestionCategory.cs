using System.Text.Json.Serialization;

namespace Vrindaya.Api.AI.Suggestions.Models;

/// <summary>
/// The business area a suggestion belongs to. Each category is produced by a
/// dedicated rule over one of the existing intelligence engines.
/// </summary>
[JsonConverter(typeof(JsonStringEnumConverter))]
public enum SuggestionCategory
{
    /// <summary>Stock has fallen to or below the engine's low-stock band.</summary>
    LowStock,

    /// <summary>Listing quality is below the acceptable score for the marketplace.</summary>
    ListingQuality,

    /// <summary>Strong margin with healthy stock — worth promoting.</summary>
    MarginOpportunity,

    /// <summary>A campaign the campaign suggestion engine rates as worth running.</summary>
    Campaign,

    /// <summary>Current price is materially away from the engine's suggested price.</summary>
    Pricing,

    /// <summary>Slow-moving or aged inventory that should be cleared.</summary>
    Overstock,
}

/// <summary>
/// Urgency of a suggestion, ordered so the most severe sorts first.
/// </summary>
[JsonConverter(typeof(JsonStringEnumConverter))]
public enum SuggestionSeverity
{
    Critical = 0,
    High = 1,
    Medium = 2,
    Low = 3,
}
