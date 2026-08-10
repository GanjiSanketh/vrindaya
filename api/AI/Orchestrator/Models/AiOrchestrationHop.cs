namespace Vrindaya.Api.AI.Orchestrator.Models;

/// <summary>
/// Outcome of a single module execution within an orchestration run.
/// </summary>
public sealed class AiOrchestrationHop
{
    public AiModuleKey Key { get; init; }

    public string Name { get; init; } = string.Empty;

    public string Role { get; init; } = string.Empty;

    /// <summary>Hop outcome: "ok", "skipped" (no registered module) or "degraded" (module threw).</summary>
    public string Status { get; init; } = "ok";

    /// <summary>Wall-clock time spent executing this hop, in milliseconds.</summary>
    public long DurationMs { get; init; }

    /// <summary>The runtime type name of <see cref="Output"/>, when present.</summary>
    public string? OutputType { get; init; }

    public object? Output { get; init; }

    /// <summary>Failure message when <see cref="Status"/> is "degraded".</summary>
    public string? Error { get; init; }
}