using Vrindaya.Api.AI.Core.Configuration;

namespace Vrindaya.Api.AI.Core.Models;

/// <summary>
/// Rolling aggregate over recorded <see cref="AiUsageEntry"/> records — the DTO
/// returned by <see cref="Interfaces.IAiUsageService.GetSummary"/>. Usage only:
/// nothing here feeds business logic and no controller exposes it directly.
///
/// Telemetry is process-local and bounded, so counts reset when the application
/// restarts. Prompt text is never recorded — only a content-derived signature.
/// </summary>
public sealed class AiUsageSummary
{
    /// <summary>Total requests recorded in this window.</summary>
    public int TotalRequests { get; init; }

    /// <summary>How many of them succeeded.</summary>
    public int SuccessCount { get; init; }

    /// <summary>How many of them failed.</summary>
    public int FailureCount { get; init; }

    /// <summary>Successful requests as a percentage of all requests (0–100).</summary>
    public double SuccessRatePercent { get; init; }

    /// <summary>Mean execution time across all requests, in milliseconds.</summary>
    public double AverageExecutionTimeMs { get; init; }

    /// <summary>Slowest observed execution time, in milliseconds.</summary>
    public long MaxExecutionTimeMs { get; init; }

    /// <summary>Estimated tokens attributed across all requests.</summary>
    public long TotalEstimatedTokens { get; init; }

    /// <summary>Request counts broken down by provider.</summary>
    public IReadOnlyDictionary<AiProviderType, int> RequestsPerProvider { get; init; } = new Dictionary<AiProviderType, int>();

    /// <summary>Request counts broken down by module.</summary>
    public IReadOnlyDictionary<string, int> RequestsPerModule { get; init; } = new Dictionary<string, int>();

    /// <summary>The most recent requests, newest first.</summary>
    public IReadOnlyList<AiUsageEntry> Recent { get; init; } = Array.Empty<AiUsageEntry>();

    /// <summary>When this summary was produced (UTC).</summary>
    public DateTime GeneratedAt { get; init; } = DateTime.UtcNow;
}
