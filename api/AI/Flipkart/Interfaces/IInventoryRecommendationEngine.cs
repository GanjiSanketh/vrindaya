using Vrindaya.Api.AI.Flipkart.DTOs;
using Vrindaya.Api.AI.Flipkart.Models;

namespace Vrindaya.Api.AI.Flipkart.Interfaces;

/// <summary>
/// Deterministic inventory recommendation engine. Generates recommendations
/// — Restock, Liquidate, Promote, Hold, Discount — based on stock, sales
/// velocity, inventory age, profit and margin. No AI, no external APIs.
/// </summary>
public interface IInventoryRecommendationEngine
{
    /// <summary>
    /// Generates an inventory recommendation for the supplied product.
    /// </summary>
    /// <param name="product">The product to evaluate.</param>
    /// <returns>An <see cref="InventoryRecommendationResultDto"/> with the recommendation.</returns>
    /// <exception cref="ArgumentNullException">Thrown when <paramref name="product"/> is null.</exception>
    InventoryRecommendationResultDto Recommend(FlipkartProduct product);
}
