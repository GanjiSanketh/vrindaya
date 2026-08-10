using System.Text.Json.Serialization;

namespace Vrindaya.Api.AI.Flipkart.Models;

/// <summary>
/// Categorises a product's current stock level into a health band
/// used by the <see cref="Engines.ProductIntelligenceEngine"/>.
/// </summary>
[JsonConverter(typeof(JsonStringEnumConverter))]
public enum StockHealth
{
    /// <summary>No units available — product is out of stock.</summary>
    OutOfStock,

    /// <summary>Stock is below the low-stock threshold — restock soon.</summary>
    Low,

    /// <summary>Stock level is within a healthy range.</summary>
    Healthy,

    /// <summary>Stock exceeds the healthy ceiling — risk of obsolescence.</summary>
    Overstock,
}
