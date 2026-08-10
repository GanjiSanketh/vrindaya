namespace Vrindaya.Api.AI.Core.Providers.Gemini;

/// <summary>
/// Transport over the Gemini REST API. Owns the connection — base address,
/// timeout and headers (including the API key) — and the single
/// "generateContent" round trip that turns a prompt into generated text.
///
/// Deliberately narrow: callers own prompt wording and result interpretation.
/// Failures are thrown as <see cref="GeminiApiException"/> with a descriptive
/// message, never returned as an empty string.
/// </summary>
public interface IGeminiHttpClient
{
    /// <summary>
    /// True when an API key is configured, so a call could be made at all.
    /// False means every caller should fall back rather than issue a request.
    /// </summary>
    bool IsConfigured { get; }

    /// <summary>
    /// Base address the client is pointed at, always with a trailing slash so
    /// relative request URIs ("{model}:generateContent") resolve correctly.
    /// </summary>
    Uri BaseAddress { get; }

    /// <summary>Overall per-client timeout derived from the Gemini settings.</summary>
    TimeSpan Timeout { get; }

    /// <summary>Model name the configuration selects, e.g. "gemini-2.5-flash".</summary>
    string Model { get; }

    /// <summary>
    /// Creates a configured <see cref="HttpClient"/> from
    /// <see cref="IHttpClientFactory"/>. The returned instance is pooled by the
    /// factory: use it and let it go out of scope — do not cache or dispose the
    /// underlying handler.
    /// </summary>
    HttpClient CreateClient();

    /// <summary>
    /// POSTs a prompt to "{model}:generateContent" and returns the generated
    /// text of the first candidate — nothing else, no metadata.
    /// </summary>
    /// <param name="prompt">The prompt text to send. Must not be blank.</param>
    /// <param name="cancellationToken">Caller cancellation — propagated, not swallowed.</param>
    /// <returns>The generated text.</returns>
    /// <exception cref="ArgumentException"><paramref name="prompt"/> is blank.</exception>
    /// <exception cref="GeminiApiException">
    /// No API key is configured, the API returned a non-success status
    /// (400/401/403/429/500 and any other), the endpoint was unreachable, the
    /// call timed out, the body was unreadable, or no text was generated.
    /// </exception>
    Task<string> GenerateAsync(string prompt, CancellationToken cancellationToken = default);

    /// <summary>
    /// As <see cref="GenerateAsync(string, CancellationToken)"/>, with an
    /// optional system instruction and an optional response MIME type
    /// (e.g. "application/json") applied to the same round trip.
    /// </summary>
    /// <param name="prompt">The prompt text to send. Must not be blank.</param>
    /// <param name="systemInstruction">Optional instruction applied to the whole call.</param>
    /// <param name="responseMimeType">Optional MIME type requested from the model.</param>
    /// <param name="cancellationToken">Caller cancellation — propagated, not swallowed.</param>
    /// <returns>The generated text.</returns>
    /// <exception cref="ArgumentException"><paramref name="prompt"/> is blank.</exception>
    /// <exception cref="GeminiApiException">The call could not produce text — see the message.</exception>
    Task<string> GenerateAsync(
        string prompt,
        string? systemInstruction,
        string? responseMimeType,
        CancellationToken cancellationToken = default);
}
