using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Vrindaya.Api.AI.Core.Configuration;
using Vrindaya.Api.AI.Core.Interfaces;
using Vrindaya.Api.Interfaces;

namespace Vrindaya.Api.AI.Core.Services;

/// <summary>
/// Default <see cref="IAiResponseCache"/>. A thin, AI-aware layer over the
/// platform's existing <see cref="ICacheService"/> (IMemoryCache) — it owns key
/// construction and the expiration policy, and delegates storage, single-flight
/// factory execution, hit/miss logging and prefix invalidation to the shared
/// infrastructure rather than reimplementing any of it.
///
/// Keys take the form
/// <c>{prefix}:{provider}:{model}:{operation}:{promptHash}</c>, so the first
/// ':' segment is the configured prefix and
/// <see cref="ICacheService.RemoveByPrefix"/> can drop the whole AI domain at
/// once. The prompt is never stored in the key — only its SHA-256 hash — which
/// keeps keys bounded in size and avoids putting prompt content into logs.
/// </summary>
public sealed class AiResponseCache : IAiResponseCache
{
    private readonly ICacheService _cache;
    private readonly IOptions<AiCacheOptions> _options;
    private readonly ILogger<AiResponseCache> _logger;

    /// <summary>Number of hex characters of the prompt hash kept in the key.</summary>
    private const int HashLength = 32;

    /// <summary>Discriminator used when the caller does not name the operation.</summary>
    private const string DefaultOperation = "general";

    public AiResponseCache(
        ICacheService cache,
        IOptions<AiCacheOptions> options,
        ILogger<AiResponseCache> logger)
    {
        _cache = cache ?? throw new ArgumentNullException(nameof(cache));
        _options = options ?? throw new ArgumentNullException(nameof(options));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public bool IsEnabled => _options.Value.Enabled;

    public async Task<TResponse?> GetOrCreateAsync<TResponse>(
        string prompt,
        AiProviderType provider,
        string model,
        Func<CancellationToken, Task<TResponse>> factory,
        string? operation = null,
        CancellationToken cancellationToken = default)
        where TResponse : class
    {
        if (factory is null)
            throw new ArgumentNullException(nameof(factory));

        var options = _options.Value;

        // Bypass entirely when disabled, or when the response is a cheap mock
        // one and mock caching has not been opted into.
        if (!options.Enabled ||
            (provider == AiProviderType.Mock && !options.CacheMockResponses))
        {
            return await factory(cancellationToken);
        }

        var key = BuildKey(prompt, provider, model, operation);

        var entryOptions = new CacheEntryOptions
        {
            AbsoluteExpirationRelativeToNow = options.AbsoluteExpiration,
            SlidingExpiration = options.SlidingExpiration,
        };

        _logger.LogDebug(
            "AiResponseCache: resolving {Operation} for provider {Provider}, model {Model}.",
            operation ?? DefaultOperation, provider, model);

        return await _cache.GetOrCreateAsync(key, factory, entryOptions, cancellationToken);
    }

    public string BuildKey(string prompt, AiProviderType provider, string model, string? operation = null)
    {
        var prefix = string.IsNullOrWhiteSpace(_options.Value.KeyPrefix)
            ? "ai"
            : _options.Value.KeyPrefix.Trim();

        var modelSegment = string.IsNullOrWhiteSpace(model) ? "default" : model.Trim();
        var operationSegment = string.IsNullOrWhiteSpace(operation) ? DefaultOperation : operation.Trim();

        return $"{prefix}:{provider}:{modelSegment}:{operationSegment}:{HashPrompt(prompt)}";
    }

    public void Remove(string prompt, AiProviderType provider, string model, string? operation = null) =>
        _cache.Remove(BuildKey(prompt, provider, model, operation));

    public void Clear()
    {
        var prefix = string.IsNullOrWhiteSpace(_options.Value.KeyPrefix)
            ? "ai"
            : _options.Value.KeyPrefix.Trim();

        _cache.RemoveByPrefix(prefix);

        _logger.LogInformation("AiResponseCache: cleared every cached AI response under '{Prefix}'.", prefix);
    }

    /// <summary>
    /// Hashes the prompt into a fixed-length hex fragment. SHA-256 keeps
    /// collisions negligible while ensuring the raw prompt never appears in a
    /// cache key or a log line.
    /// </summary>
    private static string HashPrompt(string? prompt)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(prompt ?? string.Empty));

        return Convert.ToHexString(bytes)[..HashLength].ToLowerInvariant();
    }
}
