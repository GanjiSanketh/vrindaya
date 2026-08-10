using Vrindaya.Api.AI.Dashboard.DTOs;

namespace Vrindaya.Api.AI.Dashboard.Interfaces;

/// <summary>
/// Builds the dashboard aggregation input from the live catalog. Isolates the
/// Firestore-backed repositories from <see cref="IDashboardInsightService"/>,
/// which stays a pure aggregator over the AI engines.
/// </summary>
public interface IDashboardInsightSource
{
    /// <summary>
    /// Loads the active catalog and projects it onto the aggregation request.
    /// </summary>
    /// <param name="maximumPerSection">Maximum items each insight section returns.</param>
    /// <param name="cancellationToken">Optional cancellation token.</param>
    /// <returns>A populated <see cref="DashboardInsightsRequestDto"/>.</returns>
    Task<DashboardInsightsRequestDto> BuildRequestAsync(
        int maximumPerSection,
        CancellationToken cancellationToken = default);
}
