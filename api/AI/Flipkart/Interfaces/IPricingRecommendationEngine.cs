using Vrindaya.Api.AI.Flipkart.DTOs;
using Vrindaya.Api.AI.Flipkart.Models;

namespace Vrindaya.Api.AI.Flipkart.Interfaces;

/// <summary>
/// Deterministic pricing recommendation engine. Calculates current margin,
/// competitive margin, suggested selling price, minimum safe price, maximum
/// suggested price and expected profit purely from the product's own attributes.
/// No AI, no external APIs.
/// </summary>
public interface IPricingRecommendationEngine
{
    /// <summary>
    /// Computes a pricing recommendation for the supplied product.
    /// </summary>
    /// <param name="product">The product to analyse.</param>
    /// <returns>A <see cref="PricingRecommendationResultDto"/> with all pricing metrics.</returns>
    /// <exception cref="ArgumentNullException">Thrown when <paramref name="product"/> is null.</exception>
    PricingRecommendationResultDto Recommend(FlipkartProduct product);
}
