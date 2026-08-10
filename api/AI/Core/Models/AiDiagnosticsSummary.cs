using Vrindaya.Api.AI.Core.Configuration;

namespace Vrindaya.Api.AI.Core.Models;

/// <summary>
/// Dashboard-oriented rollup of the AI subsystem's diagnostics. Aggregates the
/// active provider/model, mock mode and a snapshot each of usage, cost and
/// health, plus the rolling request counters a diagnostics dashboard needs at a
/// glance.
///
/// Process-local and bounded: every figure derives from the in-memory telemetry
/// collected by <see cref="Interfaces.IAiDiagnostics"/> /
/// <see cref="Interfaces.IAiUsageService"/> together with the live provider
/// selection, so counts reset when the application restarts. No secret (e.g. the
/// Gemini API key) is ever included.
/// </summary>
public sealed class AiDiagnosticsSummary
{
    /// <summary>Provider type currently serving requests.</summary>
    public AiProviderType Provider { get; init; }

    /// <summary>Implementation name of the provider currently serving requests.</summary>
    public string ProviderName { get; init; } = string.Empty;

    /// <summary>Model the active provider is running against.</summary>
    public string Model { get; init; } = string.Empty;

    /// <summary>True when the active provider is the deterministic mock provider (no external API calls).</summary>
    public bool IsMockModeEnabled { get; init; }

    /// <summary>Aggregated usage across the recorded window.</summary>
    public AiUsageSummary UsageSummary { get; init; } = new();

    /// <summary>Most recent cost/token estimate for the active provider and model.</summary>
    public AiCostEstimate CostSummary { get; init; } = new();

    /// <summary>Health report for the active provider (last success, failures, success rate, average latency).</summary>
    public AiProviderHealthReportDto HealthSummary { get; init; } = new();

    /// <summary>When the most recent recorded request completed (UTC), or null if none yet.</summary>
    public DateTime? LastRequest { get; init; }

    /// <summary>Response time of the most recent recorded request, in milliseconds.</summary>
    public long LastResponseTimeMs { get; init; }

    /// <summary>Successful requests as a percentage of all requests (0–100).</summary>
    public double SuccessRate { get; init; }

    /// <summary>Total prompt (input) tokens recorded across the telemetry window.</summary>
    public int TotalPrompts { get; init; }

    /// <summary>Total completion (output) tokens recorded across the telemetry window.</summary>
    public int TotalCompletions { get; init; }

    /// <summary>When this summary was produced (UTC).</summary>
    public DateTime GeneratedAt { get; init; } = DateTime.UtcNow;
}
