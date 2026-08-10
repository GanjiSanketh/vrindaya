using Vrindaya.Api.AI.Flipkart.DTOs;
using Vrindaya.Api.AI.Flipkart.Models;

namespace Vrindaya.Api.AI.Flipkart.Interfaces;

/// <summary>
/// Service that aggregates product intelligence, pricing, inventory,
/// listing quality and campaign suggestions into a single dashboard view.
/// No AI, no external APIs.
/// </summary>
public interface IFlipkartDashboardService
{
    /// <summary>
    /// Builds a dashboard view for a single product.
    /// </summary>
    /// <param name="product">The product to analyse.</param>
    /// <param name="listing">The listing data for quality evaluation.</param>
    /// <returns>A <see cref="FlipkartDashboardDto"/> with all module data.</returns>
    FlipkartDashboardDto GetDashboard(FlipkartProduct product, ListingEvaluationInput listing);

    /// <summary>
    /// Builds dashboard views for a batch of products.
    /// </summary>
    /// <param name="products">The products to analyse.</param>
    /// <param name="listings">The listing data keyed by product ID.</param>
    /// <returns>Dashboard views ordered by health score descending.</returns>
    IReadOnlyList<FlipkartDashboardDto> GetDashboardBatch(
        IReadOnlyList<FlipkartProduct> products,
        IReadOnlyDictionary<string, ListingEvaluationInput> listings);
}
