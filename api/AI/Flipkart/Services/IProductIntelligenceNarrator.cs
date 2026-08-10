using Vrindaya.Api.AI.Flipkart.DTOs;
using Vrindaya.Api.AI.Flipkart.Models;

namespace Vrindaya.Api.AI.Flipkart.Services;

/// <summary>
/// Turns the deterministic product-intelligence metrics into a written analysis
/// (positioning, audience fit, pricing observations, stock guidance, next steps)
/// using the configured AI provider and the managed ProductIntelligence prompt
/// template.
///
/// Narration only: margins, velocity, stock health, risk, recommended action and
/// the overall score are computed by
/// <see cref="Interfaces.IProductIntelligenceEngine"/> and are never altered
/// here — they are inputs to the prompt.
/// </summary>
public interface IProductIntelligenceNarrator
{
    /// <summary>
    /// Produces a written analysis for one analysed product.
    /// </summary>
    /// <param name="product">The product the metrics were computed from.</param>
    /// <param name="analysis">The engine's computed metrics.</param>
    /// <param name="cancellationToken">Optional cancellation token.</param>
    /// <returns>The generated analysis, or an empty string when unavailable.</returns>
    Task<string> NarrateAsync(
        FlipkartProduct product,
        ProductIntelligenceResultDto analysis,
        CancellationToken cancellationToken = default);
}
