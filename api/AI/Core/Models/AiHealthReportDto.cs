using Vrindaya.Api.AI.Core.Configuration;

namespace Vrindaya.Api.AI.Core.Models;

/// <summary>
/// Process-local, in-memory snapshot of the AI subsystem's health, produced by
/// <see cref="Interfaces.IAiHealthService"/>.
///
/// Nothing in this report triggers an AI call or reaches an external API — it is
/// derived from live provider selection, local configuration and already-recorded
/// observations. Counts are bounded by the in-memory diagnostics ring and
/// therefore reset when the application restarts. No secret (e.g. the Gemini API
/// key) is ever included; provider availability is a boolean signal only.
/// </summary>
public sealed class AiHealthReportDto
{
    /// <summary>Whether the active provider is resolvable and configured for use.</summary>
    public bool IsProviderAvailable { get; init; }

    /// <summary>Provider type currently serving requests.</summary>
    public AiProviderType CurrentProvider { get; init; }

    /// <summary>Implementation name of the provider currently serving requests.</summary>
    public string CurrentProviderName { get; init; } = string.Empty;

    /// <summary>True when the active provider runs in deterministic mock mode (no external API calls).</summary>
    public bool IsMockModeEnabled { get; init; }

    /// <summary>When the most recent successful request completed (UTC), or null if none yet.</summary>
    public DateTime? LastSuccessfulRequestAt { get; init; }

    /// <summary>When the most recent failed request completed (UTC), or null if none yet.</summary>
    public DateTime? LastFailedRequestAt { get; init; }

    /// <summary>Total requests/operations recorded in the in-memory telemetry window.</summary>
    public int TotalRequests { get; init; }

    /// <summary>Total failed requests/operations in the telemetry window.</summary>
    public int TotalFailures { get; init; }

    /// <summary>Successful requests as a percentage of all requests (0–100).</summary>
    public double SuccessRate { get; init; }

    /// <summary>Mean response time across recorded requests, in milliseconds.</summary>
    public double AverageResponseTimeMs { get; init; }

    /// <summary>When this report was produced (UTC).</summary>
    public DateTime GeneratedAt { get; init; } = DateTime.UtcNow;
}
