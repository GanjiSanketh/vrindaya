using Vrindaya.Api.AI.Dashboard.DTOs;

namespace Vrindaya.Api.AI.Dashboard.Interfaces;

/// <summary>
/// Aggregates the existing intelligence modules — product intelligence, the
/// recommendation engine, the campaign engine, Flipkart listing quality and
/// inventory status — into a single business dashboard view. The service owns
/// no analysis logic of its own: it fans the request out to the registered
/// engines and rolls their results up.
/// </summary>
public interface IDashboardInsightService
{
    /// <summary>
    /// Builds the aggregated dashboard for the supplied product pool.
    /// </summary>
    /// <param name="request">Products, listings and optional campaign parameters.</param>
    /// <param name="cancellationToken">Optional cancellation token.</param>
    /// <returns>A <see cref="DashboardInsightsDto"/> with every module's section populated.</returns>
    /// <exception cref="ArgumentNullException">Thrown when <paramref name="request"/> is null.</exception>
    Task<DashboardInsightsDto> GetInsightsAsync(
        DashboardInsightsRequestDto request,
        CancellationToken cancellationToken = default);
}
