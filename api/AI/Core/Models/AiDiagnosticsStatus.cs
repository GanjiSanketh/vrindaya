using Vrindaya.Api.AI.Core.Configuration;

namespace Vrindaya.Api.AI.Core.Models;

/// <summary>
/// Point-in-time operational status of the AI subsystem: which provider is
/// active, which model it runs against, whether it is fully configured, and
/// how the response cache and retry policy are currently tuned.
///
/// Diagnostics DTO — read-only, derived entirely from DI registrations and
/// local configuration. No secret is ever included: the Gemini API key is
/// reported as a boolean presence flag only.
/// </summary>
public sealed class AiDiagnosticsStatusDto
{
    /// <summary>Provider requested by the "AI:Provider" configuration value.</summary>
    public AiProviderType ConfiguredProvider { get; init; }

    /// <summary>
    /// Provider actually serving requests. Differs from
    /// <see cref="ConfiguredProvider"/> when a fallback applied — for example
    /// Gemini selected with no API key.
    /// </summary>
    public AiProviderType ActiveProvider { get; init; }

    /// <summary>Implementation name of the active provider.</summary>
    public string ActiveProviderName { get; init; } = string.Empty;

    /// <summary>True when the active provider produces deterministic offline responses.</summary>
    public bool IsMock { get; init; }

    /// <summary>Model the Gemini provider is configured to call.</summary>
    public string Model { get; init; } = string.Empty;

    /// <summary>True when a Gemini API key is present. The key itself is never exposed.</summary>
    public bool IsProviderConfigured { get; init; }

    /// <summary>True when the configured provider was overridden by a fallback.</summary>
    public bool FallbackApplied { get; init; }

    /// <summary>Current response cache configuration.</summary>
    public AiCacheStatusDto Cache { get; init; } = new();

    /// <summary>Current retry/timeout configuration.</summary>
    public AiResilienceStatusDto Resilience { get; init; } = new();

    /// <summary>Application version serving this status.</summary>
    public string Version { get; init; } = string.Empty;

    /// <summary>When this status was produced (UTC).</summary>
    public DateTime GeneratedAt { get; init; } = DateTime.UtcNow;
}

/// <summary>
/// Response cache configuration summary used by <see cref="AiDiagnosticsStatusDto"/>.
/// </summary>
public sealed class AiCacheStatusDto
{
    /// <summary>Whether AI responses are being cached.</summary>
    public bool Enabled { get; init; }

    /// <summary>Absolute lifetime of a cached response, in minutes.</summary>
    public int AbsoluteExpirationMinutes { get; init; }

    /// <summary>Idle eviction window in minutes; 0 when sliding expiration is disabled.</summary>
    public int SlidingExpirationMinutes { get; init; }

    /// <summary>Whether mock-provider responses are cached.</summary>
    public bool CacheMockResponses { get; init; }
}

/// <summary>
/// Retry and timeout configuration summary used by <see cref="AiDiagnosticsStatusDto"/>.
/// </summary>
public sealed class AiResilienceStatusDto
{
    /// <summary>Per-attempt timeout budget, in seconds.</summary>
    public int TimeoutSeconds { get; init; }

    /// <summary>Retries attempted after the initial call before giving up.</summary>
    public int MaxRetryAttempts { get; init; }

    /// <summary>Base delay of the exponential backoff, in milliseconds.</summary>
    public int RetryBaseDelayMs { get; init; }

    /// <summary>Ceiling applied to any single backoff delay, in milliseconds.</summary>
    public int RetryMaxDelayMs { get; init; }

    /// <summary>Total wall-clock budget covering every attempt plus backoff, in seconds.</summary>
    public double OverallTimeoutSeconds { get; init; }
}
