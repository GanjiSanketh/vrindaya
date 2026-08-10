using Vrindaya.Api.AI.Core.Configuration;

namespace Vrindaya.Api.AI.Core.Models;

/// <summary>
/// Outcome classification recorded on an <see cref="AiDiagnosticsEntry"/> by the
/// orchestrator. Provider-level detail (timeouts, HTTP status, safety blocks) is
/// recorded separately by the executor using its own richer status values.
/// </summary>
public enum AiDiagnosticsOutcome
{
    /// <summary>The operation produced a usable result.</summary>
    Success = 0,

    /// <summary>The operation threw before producing a result.</summary>
    Failed = 1,

    /// <summary>The caller cancelled the operation.</summary>
    Cancelled = 2,
}

/// <summary>
/// Telemetry for a single AI operation — what was asked, who answered, how long
/// it took and whether it worked.
///
/// This is a diagnostics DTO only: nothing here feeds business logic, and no
/// controller exposes it. It is written by the AI pipeline and read by
/// logging/health tooling.
///
/// Prompt content is deliberately absent. Only the prompt hash (the same one
/// the response cache keys on) is retained, so diagnostics can be correlated
/// with cache entries without ever storing customer or prompt text.
/// </summary>
public sealed class AiDiagnosticsEntry
{
    /// <summary>Logical operation, e.g. "campaigns", "summary", "health".</summary>
    public string Operation { get; init; } = string.Empty;

    /// <summary>Provider that served the request.</summary>
    public AiProviderType Provider { get; init; }

    /// <summary>Provider implementation name, e.g. "GeminiAiProvider".</summary>
    public string ProviderName { get; init; } = string.Empty;

    /// <summary>Model the request ran against.</summary>
    public string Model { get; init; } = string.Empty;

    /// <summary>Short hash of the prompt — never the prompt itself.</summary>
    public string PromptHash { get; init; } = string.Empty;

    /// <summary>Wall-clock duration of the operation, in milliseconds.</summary>
    public long ResponseTimeMs { get; init; }

    /// <summary>True when the response was served from the AI response cache.</summary>
    public bool CacheHit { get; init; }

    /// <summary>
    /// Tokens consumed by the prompt. Reported by the provider when available,
    /// otherwise estimated from the prompt length.
    /// </summary>
    public int PromptTokens { get; init; }

    /// <summary>Tokens produced in the response, reported or estimated.</summary>
    public int ResponseTokens { get; init; }

    /// <summary>Total tokens attributed to the operation.</summary>
    public int TotalTokens { get; init; }

    /// <summary>True when the token counts are estimates rather than provider-reported values.</summary>
    public bool TokensEstimated { get; init; }

    /// <summary>Whether the operation produced a usable result.</summary>
    public bool IsSuccess { get; init; }

    /// <summary>Outcome classification, e.g. "Success", "Timeout", "HttpError".</summary>
    public string Status { get; init; } = string.Empty;

    /// <summary>Failure detail when unsuccessful. Never contains credentials.</summary>
    public string? ErrorMessage { get; init; }

    /// <summary>How many transport attempts the operation consumed.</summary>
    public int Attempts { get; init; } = 1;

    /// <summary>When the operation completed (UTC).</summary>
    public DateTime Timestamp { get; init; } = DateTime.UtcNow;
}

/// <summary>
/// Rolling aggregate over recent <see cref="AiDiagnosticsEntry"/> records.
/// Diagnostics DTO only — no controller exposes it.
/// </summary>
public sealed class AiDiagnosticsSnapshot
{
    /// <summary>Number of operations covered by this snapshot.</summary>
    public int TotalOperations { get; init; }

    /// <summary>How many of them succeeded.</summary>
    public int SuccessCount { get; init; }

    /// <summary>How many of them failed.</summary>
    public int FailureCount { get; init; }

    /// <summary>How many were served from the cache.</summary>
    public int CacheHitCount { get; init; }

    /// <summary>Cache hits as a percentage of all operations (0–100).</summary>
    public double CacheHitRatePercent { get; init; }

    /// <summary>Successful operations as a percentage of all operations (0–100).</summary>
    public double SuccessRatePercent { get; init; }

    /// <summary>Mean response time across all operations, in milliseconds.</summary>
    public double AverageResponseTimeMs { get; init; }

    /// <summary>Slowest observed response time, in milliseconds.</summary>
    public long MaxResponseTimeMs { get; init; }

    /// <summary>Total tokens attributed across all operations.</summary>
    public long TotalTokens { get; init; }

    /// <summary>The most recent operations, newest first.</summary>
    public IReadOnlyList<AiDiagnosticsEntry> RecentOperations { get; init; } = [];

    /// <summary>When this snapshot was produced (UTC).</summary>
    public DateTime GeneratedAt { get; init; } = DateTime.UtcNow;
}
