using System.Text.Json.Serialization;

namespace Vrindaya.Api.AI.Flipkart.Models;

/// <summary>
/// The single best action the business should take for a product,
/// derived deterministically from its intelligence metrics.
/// </summary>
[JsonConverter(typeof(JsonStringEnumConverter))]
public enum RecommendedAction
{
    /// <summary>Promote the product aggressively — strong margin, healthy stock, decent velocity.</summary>
    Promote,

    /// <summary>Reorder units — current stock is too low for the demand rate.</summary>
    Restock,

    /// <summary>Run a clearance — overstocked with slow velocity.</summary>
    Liquidate,

    /// <summary>No action needed — products metrics are in a healthy equilibrium.</summary>
    Hold,

    /// <summary>Phase the product out — very slow velocity and aged inventory.</summary>
    Discontinue,

    /// <summary>Offer a targeted discount — healthy stock with moderate velocity or margin pressure.</summary>
    Discount,
}
