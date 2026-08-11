namespace Vrindaya.Api.AI.Core.Configuration;

/// <summary>
/// Strongly typed binding for the AI module's Gemini configuration section.
/// Values come from appsettings.*.json under the "AI:Gemini" section,
/// overridable by environment variables using the standard double-underscore
/// convention (AI__Gemini__ApiKey, AI__Gemini__Model, etc.). The API key is
/// never committed, logged or returned in any API response.
///
/// The top-level "Gemini" section (<see cref="RootSectionName"/>) is layered on
/// top of "AI:Gemini" at registration time, so deployments may supply the flat
/// Gemini__ApiKey / Gemini__Model / Gemini__MaxTokens variables instead. Blank
/// values in that section never clear an already-configured value.
/// </summary>
public class GeminiSettings
{
    public const string SectionName = "AI:Gemini";

    /// <summary>
    /// Top-level "Gemini" section, bound after <see cref="SectionName"/> so it
    /// takes precedence when present.
    /// </summary>
    public const string RootSectionName = "Gemini";

    public string ApiKey { get; set; } = string.Empty;

    /// <summary>
    /// Base address of the Google Generative Language REST API, without a
    /// trailing slash. Overridable for regional endpoints or test doubles.
    /// </summary>
    public string BaseUrl { get; set; } = "https://generativelanguage.googleapis.com/v1beta/models";

    /// <summary>
    /// Gemini model name for generateContent calls ("gemini-2.5-flash", …).
    /// Deliberately NOT hardcoded here — the value comes exclusively from
    /// configuration ("AI:Gemini:Model" / "Gemini:Model", overridable with the
    /// AI__Gemini__Model / Gemini__Model environment variables). An empty value
    /// fails loudly at request time rather than silently substituting a model
    /// the deployment never selected.
    /// </summary>
    public string Model { get; set; } = string.Empty;

    public double Temperature { get; set; } = 0.7;

    public int MaxOutputTokens { get; set; } = 4096;

    /// <summary>
    /// Configuration alias for <see cref="MaxOutputTokens"/>. The top-level
    /// "Gemini" section spells the key "MaxTokens"; binding it here keeps both
    /// spellings pointing at the single underlying value, so no consumer has to
    /// know which section supplied it.
    /// </summary>
    public int MaxTokens
    {
        get => MaxOutputTokens;
        set => MaxOutputTokens = value;
    }

    public int TimeoutSeconds { get; set; } = 60;

    /// <summary>
    /// How many times a transient failure is retried before the call is given
    /// up on. 0 disables retrying. Each attempt gets its own timeout budget.
    /// </summary>
    public int MaxRetryAttempts { get; set; } = 3;

    /// <summary>
    /// Base delay for the exponential backoff, in milliseconds. Attempt N waits
    /// roughly <c>RetryBaseDelayMs * 2^(N-1)</c>, plus jitter.
    /// </summary>
    public int RetryBaseDelayMs { get; set; } = 500;

    /// <summary>Upper bound applied to any single backoff delay, in milliseconds.</summary>
    public int RetryMaxDelayMs { get; set; } = 8_000;

    /// <summary><see cref="TimeoutSeconds"/> guarded against a missing/invalid value.</summary>
    public int EffectiveTimeoutSeconds => TimeoutSeconds > 0 ? TimeoutSeconds : 60;

    /// <summary>Total number of attempts, i.e. the first try plus the retries.</summary>
    public int TotalAttempts => Math.Max(0, MaxRetryAttempts) + 1;

    /// <summary>
    /// Wall-clock budget covering every attempt plus the worst-case backoff
    /// between them. Callers use this as their overall ceiling so a retry is
    /// never cut short by the single-attempt timeout.
    /// </summary>
    public TimeSpan OverallTimeout
    {
        get
        {
            var attempts = TotalAttempts;
            var attemptBudget = TimeSpan.FromSeconds((double)EffectiveTimeoutSeconds * attempts);
            var maxDelayMs = RetryMaxDelayMs > 0 ? RetryMaxDelayMs : 8_000;
            var backoffBudget = TimeSpan.FromMilliseconds((double)maxDelayMs * Math.Max(0, attempts - 1));

            return attemptBudget + backoffBudget;
        }
    }

    /// <summary>
    /// Per-1,000,000-token pricing for the configured <see cref="Model"/> in USD,
    /// used by the AI cost estimator to approximate API spend.
    ///
    /// Defaults reflect the Gemini 1.5 Flash published list prices. Override both
    /// values in configuration (AI:Gemini:InputTokenPricePerMillion /
    /// OutputTokenPricePerMillion) to track the active model and region
    /// accurately — these are inputs to an estimate, not a billing source of truth.
    /// </summary>

    /// <summary>Input (prompt) token price, USD per 1,000,000 tokens.</summary>
    public decimal InputTokenPricePerMillion { get; set; } = 0.075m;

    /// <summary>Output (response) token price, USD per 1,000,000 tokens.</summary>
    public decimal OutputTokenPricePerMillion { get; set; } = 0.30m;
}