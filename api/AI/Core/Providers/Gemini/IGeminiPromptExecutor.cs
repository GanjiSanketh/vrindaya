using Vrindaya.Api.AI.Core.Providers.Gemini.Models;

namespace Vrindaya.Api.AI.Core.Providers.Gemini;

/// <summary>
/// Single-responsibility transport for the Gemini "generateContent" endpoint:
/// accepts a prompt, executes the request, parses the response and returns a
/// strongly typed result.
///
/// Callers (providers, engines) own prompt wording and result interpretation;
/// this abstraction owns only the round trip. Failures are returned as data on
/// <see cref="GeminiPromptResult"/> rather than thrown, so callers can fall
/// back deterministically. No retry policy is applied — one prompt, one call.
/// </summary>
public interface IGeminiPromptExecutor
{
    /// <summary>True when no API key is configured, so no call can be made.</summary>
    bool IsConfigured { get; }

    /// <summary>
    /// Executes a prompt and returns the generated text.
    /// </summary>
    /// <param name="prompt">The user prompt to send.</param>
    /// <param name="systemInstruction">Optional system instruction applied to the call.</param>
    /// <param name="responseMimeType">Optional MIME type requested from the model (e.g. "application/json").</param>
    /// <param name="cancellationToken">Caller cancellation — propagated, not swallowed.</param>
    /// <returns>The strongly typed execution result.</returns>
    Task<GeminiPromptResult> ExecuteAsync(
        string prompt,
        string? systemInstruction = null,
        string? responseMimeType = null,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Executes a prompt in JSON mode and deserializes the returned text into
    /// <typeparamref name="TValue"/>. A markdown code fence around the payload
    /// is tolerated.
    /// </summary>
    /// <typeparam name="TValue">Contract the model is asked to emit.</typeparam>
    /// <param name="prompt">The user prompt to send.</param>
    /// <param name="systemInstruction">Optional system instruction describing the expected JSON shape.</param>
    /// <param name="cancellationToken">Caller cancellation — propagated, not swallowed.</param>
    /// <returns>The execution result with the parsed payload when available.</returns>
    Task<GeminiPromptResult<TValue>> ExecuteAsync<TValue>(
        string prompt,
        string? systemInstruction = null,
        CancellationToken cancellationToken = default)
        where TValue : class;
}
