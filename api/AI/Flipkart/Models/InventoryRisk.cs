using System.Text.Json.Serialization;

namespace Vrindaya.Api.AI.Flipkart.Models;

/// <summary>
/// Risk level for a product's inventory position, combining stock
/// health, sales velocity and days-of-inventory into a single
/// severity band.
/// </summary>
[JsonConverter(typeof(JsonStringEnumConverter))]
public enum InventoryRisk
{
    /// <summary>No units on hand — immediate restock required.</summary>
    Critical,

    /// <summary>High risk: low stock moving fast or overstock moving slowly.</summary>
    High,

    /// <summary>Moderate risk: some imbalance between stock and velocity.</summary>
    Medium,

    /// <summary>Low risk: stock and velocity are well-balanced.</summary>
    Low,
}
