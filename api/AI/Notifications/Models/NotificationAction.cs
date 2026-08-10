using System.Text.Json.Serialization;

namespace Vrindaya.Api.AI.Notifications.Models;

/// <summary>
/// The concrete operation a notification asks the operator to perform. Each
/// value maps to an existing workspace module, so a notification is always
/// actionable rather than informational.
/// </summary>
[JsonConverter(typeof(JsonStringEnumConverter))]
public enum NotificationAction
{
    /// <summary>Reorder units for a product that is out of or low on stock.</summary>
    RestockProduct,

    /// <summary>Fix a listing whose quality score is below the marketplace standard.</summary>
    ImproveListing,

    /// <summary>Put more spend behind a campaign the campaign engine rates highly.</summary>
    IncreaseCampaignBudget,

    /// <summary>Produce an Instagram reel for a product worth promoting.</summary>
    CreateInstagramReel,

    /// <summary>Produce a Flipkart product video for a marketplace listing.</summary>
    GenerateFlipkartVideo,

    /// <summary>Adjust the selling price toward the pricing engine's suggestion.</summary>
    AdjustPricing,

    /// <summary>Clear slow-moving or aged inventory.</summary>
    ClearInventory,
}

/// <summary>
/// Urgency of a notification, ordered so the most severe sorts first.
/// </summary>
[JsonConverter(typeof(JsonStringEnumConverter))]
public enum NotificationPriority
{
    Critical = 0,
    High = 1,
    Medium = 2,
    Low = 3,
}
