namespace Vrindaya.Api.AI.Core.Configuration;

/// <summary>
/// Strongly typed binding for the AI module's Mock provider configuration
/// section. Values come from appsettings.*.json under the "AI:Mock" section,
/// overridable by environment variables using the standard double-underscore
/// convention (AI__Mock__Model, AI__Mock__Temperature, etc.).
///
/// The mock provider is deterministic and makes no external calls, so ApiKey,
/// retry and backoff settings do not apply to it; the knobs here describe the
/// generation surface it reports through diagnostics (model, temperature, max
/// tokens, timeout) so consumers never hardcode provider-specific values.
/// </summary>
public class MockProviderSettings
{
    public const string SectionName = "AI:Mock";

    /// <summary>
    /// The model name the mock provider claims to run. Informational only — no
    /// request shaping depends on it, but diagnostics and audit records treat it
    /// as the model in use.
    /// </summary>
    public string Model { get; set; } = "mock-1";

    /// <summary>
    /// Temperature attributed to mock generations. The mock provider does not
    /// sample, but the value is reported consistently for parity with the real
    /// providers' configuration surface.
    /// </summary>
    public double Temperature { get; set; } = 0.7;

    /// <summary>
    /// Upper bound on tokens attributed to a mock response. Used by diagnostics
    /// to keep token estimates and budgets comparable across providers.
    /// </summary>
    public int MaxOutputTokens { get; set; } = 4096;

    /// <summary>
    /// Per-attempt timeout budget in seconds, for parity with the Gemini
    /// provider's configuration. The mock is synchronous so this is
    /// informational unless a call is wrapped in a cancellation budget.
    /// </summary>
    public int TimeoutSeconds { get; set; } = 60;

    /// <summary><see cref="TimeoutSeconds"/> guarded against a missing/invalid value.</summary>
    public int EffectiveTimeoutSeconds => TimeoutSeconds > 0 ? TimeoutSeconds : 60;
}