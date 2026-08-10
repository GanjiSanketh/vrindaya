using Vrindaya.Api.AI.Core.Configuration;

namespace Vrindaya.Api.AI.Core.Models;

/// <summary>
/// Strongly typed health report for the currently active AI provider, derived
/// from live provider selection plus the rolling AI-operations telemetry.
/// Diagnostics/health DTO only — never feeds business logic.
///
/// Metrics are scoped to the active provider: every count and average in the
/// report covers only the operations that provider served.
/// </summary>
public sealed class AiProviderHealthReportDto
{
    /// <summary>The provider currently serving requests.</summary>
    public AiProviderType CurrentProvider { get; init; }

    /// <summary>Implementation name of the current provider, e.g. "GeminiAiProvider".</summary>
    public string CurrentProviderName { get; init; } = string.Empty;

    /// <summary>Timestamp of the most recent successful operation by this provider, or null.</summary>
    public DateTime? LastSuccessfulRequestAt { get; init; }

    /// <summary>How many operations by this provider failed.</summary>
    public int FailureCount { get; init; }

    /// <summary>How many operations by this provider succeeded.</summary>
    public int SuccessCount { get; init; }

    /// <summary>Total operations recorded for this provider.</summary>
    public int TotalOperations { get; init; }

    /// <summary>Successful operations as a percentage of all this provider's operations (0–100).</summary>
    public double SuccessRatePercent { get; init; }

    /// <summary>Mean response time across this provider's operations, in milliseconds.</summary>
    public double AverageResponseTimeMs { get; init; }

    /// <summary>When this report was produced (UTC).</summary>
    public DateTime GeneratedAt { get; init; } = DateTime.UtcNow;
}