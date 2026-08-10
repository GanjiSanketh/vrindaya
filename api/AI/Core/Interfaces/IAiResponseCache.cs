using Vrindaya.Api.AI.Core.Configuration;

namespace Vrindaya.Api.AI.Core.Interfaces;

/// <summary>
/// Memoizes AI provider responses so an identical prompt is not paid for twice.
///
/// Entries are keyed by the triple that fully determines an AI answer:
/// <list type="bullet">
///   <item>a hash of the prompt (including any system instruction);</item>
///   <item>the provider that produced it (Mock vs Gemini);</item>
///   <item>the model name it was produced with.</item>
/// </list>
/// Changing any one of them yields a different key, so switching provider or
/// model can never serve a stale answer from the previous configuration.
///
/// Backed by the platform's existing <see cref="Vrindaya.Api.Interfaces.ICacheService"/>
/// (IMemoryCache), which brings single-flight factory execution, consistent
/// hit/miss logging and prefix invalidation along for free.
/// </summary>
public interface IAiResponseCache
{
    /// <summary>Whether caching is currently enabled by configuration.</summary>
    bool IsEnabled { get; }

    /// <summary>
    /// Returns the cached response for the prompt/provider/model triple, or
    /// executes <paramref name="factory"/> on a miss and caches its result.
    /// The factory runs at most once per key, even under concurrent misses.
    /// </summary>
    /// <typeparam name="TResponse">The cached response contract.</typeparam>
    /// <param name="prompt">The prompt the response was generated from.</param>
    /// <param name="provider">Provider that serves the request.</param>
    /// <param name="model">Model the request is executed against.</param>
    /// <param name="factory">Produces the response on a cache miss.</param>
    /// <param name="operation">Optional operation discriminator (e.g. "campaigns", "summary").</param>
    /// <param name="cancellationToken">Optional cancellation token.</param>
    Task<TResponse?> GetOrCreateAsync<TResponse>(
        string prompt,
        AiProviderType provider,
        string model,
        Func<CancellationToken, Task<TResponse>> factory,
        string? operation = null,
        CancellationToken cancellationToken = default)
        where TResponse : class;

    /// <summary>
    /// Builds the cache key for a prompt/provider/model triple. Exposed so
    /// callers can log or invalidate a specific entry.
    /// </summary>
    string BuildKey(string prompt, AiProviderType provider, string model, string? operation = null);

    /// <summary>Removes a single cached response.</summary>
    void Remove(string prompt, AiProviderType provider, string model, string? operation = null);

    /// <summary>Invalidates every cached AI response in one call.</summary>
    void Clear();
}
