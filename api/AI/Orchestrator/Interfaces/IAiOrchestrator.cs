using Vrindaya.Api.AI.Orchestrator.Models;

namespace Vrindaya.Api.AI.Orchestrator.Interfaces;

/// <summary>
/// Hub-and-spoke coordinator for the AI module registry. Routes a request to a
/// named path, executes each module in order over the registered modules, and
/// returns a single response envelope with per-hop timing and outcomes.
/// </summary>
public interface IAiOrchestrator
{
    /// <summary>
    /// Executes a request through the named route's hop sequence.
    /// </summary>
    /// <param name="request">Request carrying the route key and module payloads.</param>
    /// <param name="cancellationToken">Optional cancellation token.</param>
    /// <returns>An <see cref="AiOrchestrationResponse"/> envelope with computed, timed hops.</returns>
    /// <exception cref="ArgumentNullException">Thrown when <paramref name="request"/> is null.</exception>
    /// <exception cref="ArgumentException">Thrown when the route is empty or unknown.</exception>
    Task<AiOrchestrationResponse> ExecuteAsync(
        AiOrchestratorRequest request,
        CancellationToken cancellationToken = default);

    /// <summary>Route table exposed by the orchestration layer.</summary>
    IReadOnlyList<AiOrchestrationRoute> GetRoutes();
}