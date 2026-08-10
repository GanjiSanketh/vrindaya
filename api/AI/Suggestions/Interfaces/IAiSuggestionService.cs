using Vrindaya.Api.AI.Dashboard.DTOs;
using Vrindaya.Api.AI.Suggestions.DTOs;

namespace Vrindaya.Api.AI.Suggestions.Interfaces;

/// <summary>
/// Turns the existing intelligence engines' output into actionable business
/// suggestions — low stock alerts, poor listing quality, high margin
/// opportunities, campaign suggestions and pricing improvements. Rule-based
/// only: no AI provider is invoked and no metric is invented here.
/// </summary>
public interface IAiSuggestionService
{
    /// <summary>
    /// Generates suggestions for the supplied product pool.
    /// </summary>
    /// <param name="request">Products, listings and the per-section cap, reused from the dashboard contract.</param>
    /// <param name="cancellationToken">Optional cancellation token.</param>
    /// <returns>An <see cref="AiSuggestionCollectionDto"/> ordered by severity then impact.</returns>
    /// <exception cref="ArgumentNullException">Thrown when <paramref name="request"/> is null.</exception>
    Task<AiSuggestionCollectionDto> GenerateAsync(
        DashboardInsightsRequestDto request,
        CancellationToken cancellationToken = default);
}
