using Vrindaya.Api.AI.Core.Configuration;

namespace Vrindaya.Api.AI.Core.Models;

/// <summary>
/// Outcome classification recorded on an <see cref="AiUsageEntry"/> by the
/// orchestrator. Provider-level detail (timeouts, HTTP status, safety blocks)
/// is recorded separately; usage only captures the broad result band.
/// </summary>
public enum AiUsageOutcome
{
    /// <summary>The operation produced a usable result.</summary>
    Success = 0,

    /// <summary>The operation threw before producing a result.</summary>
    Failed = 1,

    /// <summary>The caller cancelled the operation.</summary>
    Cancelled = 2,
}

/// <summary>
/// A single AI usage record — one request, its module and provider, how long it
/// took and whether it worked.
///
/// This is a usage DTO only: nothing here feeds business logic, and no
/// controller surfaces raw entries. It is written by the AI pipeline and read
/// by usage-reporting tooling. Prompt text is deliberately absent — the same
/// content-derived signature used by the response cache is retained instead, so
/// usage can be correlated with cache entries without storing prompt text.
/// </summary>
public sealed class AiUsageEntry
{
    /// <summary>Caller-supplied request id; empty when the caller did not provide one.</summary>
    public string RequestId { get; init; } = string.Empty;

    /// <summary>AI module that handled the request, e.g. "Campaign", "Prompt", "Recommendation".</summary>
    public string Module { get; init; } = string.Empty;

    /// <summary>Provider that served the request.</summary>
    public AiProviderType Provider { get; init; }

    /// <summary>Provider implementation name, e.g. "MockAiProvider".</summary>
    public string ProviderName { get; init; } = string.Empty;

    /// <summary>Model the request ran against.</summary>
    public string Model { get; init; } = string.Empty;

    /// <summary>Wall-clock duration of the operation, in milliseconds.</summary>
    public long ExecutionTimeMs { get; init; }

    /// <summary>
    /// Tokens attributed to the operation. Reported by the provider when
    /// available, otherwise estimated from content length.
    /// </summary>
    public int EstimatedTokens { get; init; }

    /// <summary>True when the token count is an estimate rather than provider-reported.</summary>
    public bool TokensEstimated { get; init; }

    /// <summary>Estimated API cost in USD, derived from configured per-million-token pricing.</summary>
    public decimal EstimatedCostUsd { get; init; }

    /// <summary>ISO currency code of the cost estimate.</summary>
    public string Currency { get; init; } = "USD";

    /// <summary>Whether the operation produced a usable result.</summary>
    public bool IsSuccess { get; init; }

    /// <summary>Outcome classification, e.g. "Success", "Failed", "Cancelled".</summary>
    public string Status { get; init; } = string.Empty;

    /// <summary>Failure detail when unsuccessful. Never contains credentials.</summary>
    public string? ErrorMessage { get; init; }

    /// <summary>When the operation completed (UTC).</summary>
    public DateTime Timestamp { get; init; } = DateTime.UtcNow;
}
