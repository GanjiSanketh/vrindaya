namespace Vrindaya.Api.AI.Orchestrator.Models;

/// <summary>
/// Envelope returned by the AI orchestrator — request metadata, per-hop
/// execution outcomes, aggregate timing and the final result payload.
/// </summary>
public sealed class AiOrchestrationResponse
{
    public string RequestId { get; init; } = string.Empty;

    public string Route { get; init; } = string.Empty;

    public string RouteLabel { get; init; } = string.Empty;

    /// <summary>Per-hop outcomes in execution order.</summary>
    public IReadOnlyList<AiOrchestrationHop> Hops { get; init; } = Array.Empty<AiOrchestrationHop>();

    public long DurationMs { get; init; }

    /// <summary>Overall run status, e.g. "200 OK" or "200 OK (1 degraded, 0 skipped)".</summary>
    public string Status { get; init; } = string.Empty;

    public DateTime Timestamp { get; init; }

    /// <summary>Output of the final hop, when any.</summary>
    public object? Result { get; init; }
}