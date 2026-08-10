namespace Vrindaya.Api.AI.Core.Configuration;

/// <summary>
/// Strongly typed binding for the AI response cache. Values come from
/// appsettings.*.json under the "AI:Cache" section, overridable by environment
/// variables using the standard double-underscore convention
/// (AI__Cache__Enabled, AI__Cache__AbsoluteExpirationMinutes, etc.).
///
/// Caching AI responses removes duplicate provider calls for identical prompts,
/// which matters because those calls are both slow and billed per token.
/// </summary>
public class AiCacheOptions
{
    public const string SectionName = "AI:Cache";

    /// <summary>Master switch. When false, every request goes straight to the provider.</summary>
    public bool Enabled { get; set; } = true;

    /// <summary>
    /// How long a cached response stays valid after it was created, in minutes.
    /// Absolute expiry keeps generated marketing copy from going stale.
    /// </summary>
    public int AbsoluteExpirationMinutes { get; set; } = 30;

    /// <summary>
    /// Optional idle window in minutes — an unused entry is evicted this long
    /// after its last read. 0 disables sliding expiration.
    /// </summary>
    public int SlidingExpirationMinutes { get; set; }

    /// <summary>
    /// Whether responses served by the mock provider are cached. Off by default:
    /// mock responses are already cheap and deterministic, and caching them
    /// makes local development results harder to iterate on.
    /// </summary>
    public bool CacheMockResponses { get; set; }

    /// <summary>
    /// Key prefix for every AI cache entry. Matches the first ':' segment that
    /// <c>ICacheService.RemoveByPrefix</c> uses, so the whole AI domain can be
    /// invalidated in one call.
    /// </summary>
    public string KeyPrefix { get; set; } = "ai";

    /// <summary><see cref="AbsoluteExpirationMinutes"/> as a TimeSpan, guarded against invalid values.</summary>
    public TimeSpan AbsoluteExpiration =>
        TimeSpan.FromMinutes(AbsoluteExpirationMinutes > 0 ? AbsoluteExpirationMinutes : 30);

    /// <summary><see cref="SlidingExpirationMinutes"/> as a TimeSpan, or null when disabled.</summary>
    public TimeSpan? SlidingExpiration =>
        SlidingExpirationMinutes > 0 ? TimeSpan.FromMinutes(SlidingExpirationMinutes) : null;
}
