using System.Collections.Concurrent;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Primitives;
using Vrindaya.Api.Interfaces;

namespace Vrindaya.Api.Services;

/// <summary>
/// Default <see cref="ICacheService"/> implementation backed by IMemoryCache.
/// Values created via <see cref="GetOrCreateAsync{T}"/> are stored as
/// Lazy&lt;Task&lt;T&gt;&gt; so a single-flight factory runs exactly once per key
/// (stampede protection). Prefix clearing uses per-prefix cancellation
/// tokens, so RemoveByPrefix invalidates matching entries cheaply and safely
/// without enumerating the cache.
/// </summary>
public class MemoryCacheService : ICacheService
{
    private static readonly TimeSpan DefaultSlidingExpiration = TimeSpan.FromSeconds(60);

    private readonly IMemoryCache _cache;
    private readonly ILogger<MemoryCacheService> _logger;
    private readonly ConcurrentDictionary<string, CancellationTokenSource> _prefixTokens = new();

    public MemoryCacheService(IMemoryCache cache, ILogger<MemoryCacheService> logger)
    {
        _cache = cache;
        _logger = logger;
    }

    public async Task<T?> GetOrCreateAsync<T>(
        string key,
        Func<CancellationToken, Task<T>> factory,
        CacheEntryOptions? options = null,
        CancellationToken cancellationToken = default)
    {
        if (_cache.TryGetValue(key, out Lazy<Task<T>>? cached) && cached != null)
        {
            _logger.LogInformation("Cache HIT {CacheKey} at {Timestamp:O}", key, DateTimeOffset.UtcNow);
            return await cached.Value.WaitAsync(cancellationToken).ConfigureAwait(false);
        }

        _logger.LogInformation("Cache MISS {CacheKey} at {Timestamp:O}", key, DateTimeOffset.UtcNow);

        var lazy = new Lazy<Task<T>>(() => factory(cancellationToken), LazyThreadSafetyMode.ExecutionAndPublication);

        var entry = _cache.CreateEntry(key);
        entry.Value = lazy;
        ApplyExpiration(entry, options);
        AddPrefixToken(entry, key);
        entry.Dispose();

        try
        {
            return await lazy.Value.WaitAsync(cancellationToken).ConfigureAwait(false);
        }
        catch
        {
            _cache.Remove(key);
            throw;
        }
    }

    public async Task<T?> GetAsync<T>(string key, CancellationToken cancellationToken = default)
    {
        if (_cache.TryGetValue(key, out var value))
        {
            _logger.LogInformation("Cache HIT {CacheKey} at {Timestamp:O}", key, DateTimeOffset.UtcNow);
            if (value is Lazy<Task<T>> lazy)
            {
                return await lazy.Value.WaitAsync(cancellationToken).ConfigureAwait(false);
            }

            return value is T plain ? plain : default;
        }

        _logger.LogInformation("Cache MISS {CacheKey} at {Timestamp:O}", key, DateTimeOffset.UtcNow);
        return default;
    }

    public void Set<T>(string key, T value, CacheEntryOptions? options = null)
    {
        var entry = _cache.CreateEntry(key);
        entry.Value = value;
        ApplyExpiration(entry, options);
        AddPrefixToken(entry, key);
        entry.Dispose();
    }

    public void Remove(string key)
    {
        _cache.Remove(key);
        _logger.LogInformation("Cache INVALIDATE {CacheKey} at {Timestamp:O}", key, DateTimeOffset.UtcNow);
    }

    public void RemoveByPrefix(string prefix)
    {
        var newCts = new CancellationTokenSource();
        var oldCts = _prefixTokens.AddOrUpdate(prefix, newCts, (_, _) => newCts);

        if (!ReferenceEquals(oldCts, newCts))
        {
            oldCts.Cancel();
            oldCts.Dispose();
        }

        _logger.LogInformation("Cache INVALIDATE {CacheKey} at {Timestamp:O}", prefix, DateTimeOffset.UtcNow);
    }

    private static void ApplyExpiration(ICacheEntry entry, CacheEntryOptions? options)
    {
        if (options?.AbsoluteExpirationRelativeToNow is TimeSpan absolute)
        {
            entry.AbsoluteExpirationRelativeToNow = absolute;
        }

        if (options?.SlidingExpiration is TimeSpan sliding)
        {
            entry.SlidingExpiration = sliding;
        }

        if (options is null
            || (options.AbsoluteExpirationRelativeToNow is null && options.SlidingExpiration is null))
        {
            entry.SlidingExpiration = DefaultSlidingExpiration;
        }
    }

    private void AddPrefixToken(ICacheEntry entry, string key)
    {
        var prefix = GetPrefix(key);
        var cts = _prefixTokens.GetOrAdd(prefix, _ => new CancellationTokenSource());
        entry.AddExpirationToken(new CancellationChangeToken(cts.Token));
    }

    private static string GetPrefix(string key)
    {
        var colon = key.IndexOf(':');
        return colon > 0 ? key[..colon] : key;
    }
}
