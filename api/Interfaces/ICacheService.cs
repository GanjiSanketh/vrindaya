namespace Vrindaya.Api.Interfaces;

/// <summary>
/// Reusable, process-local cache built on ASP.NET Core's IMemoryCache.
/// Provides async get-or-create with optional sliding/absolute expiration,
/// explicit single-key removal, and prefix-scoped clearing. Thread-safe and
/// stampede-protected (a key's factory runs at most once, even under
/// concurrent misses). Prefer injecting this over IMemoryCache directly so
/// callers get consistent hit/miss logging and a single invalidation story.
/// </summary>
public interface ICacheService
{
    /// <summary>
    /// Returns the cached value for <paramref name="key"/>, or runs
    /// <paramref name="factory"/> on a miss, caches its result, and returns it.
    /// The factory is invoked at most once per key even under concurrent load.
    /// </summary>
    Task<T?> GetOrCreateAsync<T>(
        string key,
        Func<CancellationToken, Task<T>> factory,
        CacheEntryOptions? options = null,
        CancellationToken cancellationToken = default);

    /// <summary>Returns the cached value for <paramref name="key"/>, or default when absent.</summary>
    Task<T?> GetAsync<T>(string key, CancellationToken cancellationToken = default);

    /// <summary>Stores <paramref name="value"/> under <paramref name="key"/>, replacing any existing entry.</summary>
    void Set<T>(string key, T value, CacheEntryOptions? options = null);

    /// <summary>Removes the single entry for <paramref name="key"/>, if present.</summary>
    void Remove(string key);

    /// <summary>
    /// Removes every entry whose key starts with "<paramref name="prefix"/>:"
    /// (or equals the prefix). Prefixes are derived from the key's first ':'
    /// segment, so callers can clear a whole logical domain in one call
    /// without enumerating cache entries.
    /// </summary>
    void RemoveByPrefix(string prefix);
}

/// <summary>
/// Expiration policy for a cache entry. When neither value is set, a default
/// sliding expiration is applied by <see cref="ICacheService"/>.
/// </summary>
public sealed class CacheEntryOptions
{
    /// <summary>Entry expires this long after it was first created.</summary>
    public TimeSpan? AbsoluteExpirationRelativeToNow { get; init; }

    /// <summary>Entry is removed if unused for this long; each read resets the timer.</summary>
    public TimeSpan? SlidingExpiration { get; init; }
}
