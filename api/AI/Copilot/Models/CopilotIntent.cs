using System.Text.Json.Serialization;

namespace Vrindaya.Api.AI.Copilot.Models;

/// <summary>
/// The business capability an operator's copilot message is asking for.
/// Resolved deterministically by <see cref="Services.IntentClassifier"/> — no
/// AI provider is involved.
/// </summary>
[JsonConverter(typeof(JsonStringEnumConverter))]
public enum CopilotIntent
{
    /// <summary>No supported intent could be resolved from the message.</summary>
    Unknown,

    /// <summary>Flipkart catalog/listing optimization, compliance or keywords.</summary>
    FlipkartListing,

    /// <summary>Marketing campaign planning and generation.</summary>
    Campaign,

    /// <summary>Instagram post/caption content.</summary>
    Instagram,

    /// <summary>Short-form video (reel/short) scripts.</summary>
    Reel,

    /// <summary>Multi-slide carousel content.</summary>
    Carousel,

    /// <summary>Product-level intelligence — margin, velocity, stock health, actions.</summary>
    ProductIntelligence,

    /// <summary>Discount, bundle, upsell, cross-sell and clearance recommendations.</summary>
    Recommendation,

    /// <summary>Dashboard summaries and aggregated business overviews.</summary>
    Dashboard,

    /// <summary>Analytics, reporting and trend questions.</summary>
    Analytics,
}
