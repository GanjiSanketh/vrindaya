using Vrindaya.Api.AI.Flipkart.DTOs;
using Vrindaya.Api.AI.Flipkart.Models;

namespace Vrindaya.Api.AI.Flipkart.Interfaces;

/// <summary>
/// Deterministic product-intelligence engine. Computes margin, stock health,
/// sales velocity, inventory risk, a recommended action and an overall product
/// score purely from the product's own attributes — no AI provider calls, no
/// Firestore reads, no randomness.
/// </summary>
public interface IProductIntelligenceEngine
{
    /// <summary>
    /// Analyses a single product and returns its intelligence result.
    /// </summary>
    /// <param name="product">The product to analyse.</param>
    /// <returns>A <see cref="ProductIntelligenceResultDto"/> with all computed metrics.</returns>
    /// <exception cref="ArgumentNullException">Thrown when <paramref name="product"/> is null.</exception>
    ProductIntelligenceResultDto Analyze(FlipkartProduct product);
}
