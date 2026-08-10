namespace Vrindaya.Api.AI.Core.Providers.Gemini.Models;

/// <summary>
/// Outcome classification for a single Gemini prompt execution. Lets callers
/// branch on <em>why</em> a call did not produce usable text without inspecting
/// exception types or log output.
/// </summary>
public enum GeminiExecutionStatus
{
    /// <summary>The model returned usable text.</summary>
    Success = 0,

    /// <summary>No API key is configured — the call was never attempted.</summary>
    NotConfigured = 1,

    /// <summary>The API answered with a non-success HTTP status code.</summary>
    HttpError = 2,

    /// <summary>The call exceeded the configured timeout budget.</summary>
    Timeout = 3,

    /// <summary>A network/transport failure prevented the round trip.</summary>
    TransportError = 4,

    /// <summary>The response body could not be read as a Gemini payload.</summary>
    InvalidResponse = 5,

    /// <summary>The prompt or candidate was rejected by a safety filter.</summary>
    Blocked = 6,

    /// <summary>The call succeeded but no candidate carried any text.</summary>
    EmptyResponse = 7,
}

/// <summary>
/// Strongly typed result of one Gemini prompt execution. Carries the generated
/// text plus the transport and usage metadata pulled from the
/// <see cref="GeminiResponse"/> wire model, so callers never touch
/// <see cref="HttpResponseMessage"/> or raw JSON.
///
/// Execution failures are represented as data (<see cref="Status"/> +
/// <see cref="ErrorMessage"/>), not exceptions — only caller-driven
/// cancellation propagates.
/// </summary>
public class GeminiPromptResult
{
    /// <summary>True when the model returned usable text.</summary>
    public bool IsSuccess { get; init; }

    /// <summary>Why the execution ended the way it did.</summary>
    public GeminiExecutionStatus Status { get; init; }

    /// <summary>Generated text of the first candidate, empty when unsuccessful.</summary>
    public string Text { get; init; } = string.Empty;

    /// <summary>Model that served the request (from configuration).</summary>
    public string Model { get; init; } = string.Empty;

    /// <summary>Reason generation stopped, e.g. "STOP" or "MAX_TOKENS".</summary>
    public string? FinishReason { get; init; }

    /// <summary>Tokens consumed by the prompt, when reported by the API.</summary>
    public int PromptTokenCount { get; init; }

    /// <summary>Tokens produced in the response, when reported by the API.</summary>
    public int CandidateTokenCount { get; init; }

    /// <summary>Total tokens billed for the round trip, when reported by the API.</summary>
    public int TotalTokenCount { get; init; }

    /// <summary>Measured wall-clock duration of the round trip, in milliseconds.</summary>
    public long LatencyMs { get; init; }

    /// <summary>Diagnostic message for unsuccessful executions. Never contains the API key.</summary>
    public string? ErrorMessage { get; init; }
}

/// <summary>
/// A <see cref="GeminiPromptResult"/> whose JSON text payload has been
/// deserialized into <typeparamref name="TValue"/>. <see cref="Value"/> is
/// populated only when both the call and the parse succeeded.
/// </summary>
/// <typeparam name="TValue">Contract the model was asked to emit.</typeparam>
public sealed class GeminiPromptResult<TValue> : GeminiPromptResult
    where TValue : class
{
    /// <summary>Parsed payload, or <c>null</c> when the call or parse failed.</summary>
    public TValue? Value { get; init; }

    /// <summary>True when a payload was both returned and successfully parsed.</summary>
    public bool HasValue => Value is not null;
}
