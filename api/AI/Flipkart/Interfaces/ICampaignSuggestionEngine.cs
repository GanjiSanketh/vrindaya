using Vrindaya.Api.AI.Flipkart.DTOs;
using Vrindaya.Api.AI.Flipkart.Models;

namespace Vrindaya.Api.AI.Flipkart.Interfaces;

/// <summary>
/// Deterministic campaign suggestion engine. Generates campaign suggestions
/// by combining product intelligence, listing quality, inventory recommendation
/// and pricing recommendation signals. Returns recommendation objects only —
/// no marketing text. No AI, no external APIs.
/// </summary>
public interface ICampaignSuggestionEngine
{
    /// <summary>
    /// Generates a campaign suggestion for the supplied product by combining
    /// signals from all four recommendation engines.
    /// </summary>
    /// <param name="product">The product to evaluate.</param>
    /// <param name="listing">The listing data for quality evaluation.</param>
    /// <returns>A <see cref="CampaignSuggestionResultDto"/> with the recommendation.</returns>
    /// <exception cref="ArgumentNullException">Thrown when <paramref name="product"/> or <paramref name="listing"/> is null.</exception>
    CampaignSuggestionResultDto Suggest(FlipkartProduct product, ListingEvaluationInput listing);

    /// <summary>
    /// Generates campaign suggestions for a batch of products, ordered by
    /// score descending.
    /// </summary>
    /// <param name="products">The products to evaluate.</param>
    /// <param name="listings">The listing data keyed by product ID.</param>
    /// <returns>Ordered campaign suggestions (highest score first).</returns>
    IReadOnlyList<CampaignSuggestionResultDto> SuggestBatch(
        IReadOnlyList<FlipkartProduct> products,
        IReadOnlyDictionary<string, ListingEvaluationInput> listings);
}
