namespace Vrindaya.Api.Constants;

/// <summary>
/// Application-wide literal values shared across services, controllers and middleware.
/// </summary>
public static class AppConstants
{
    public const string ApplicationName = "Vrindaya API";
    public const string ApplicationVersion = "1.0.0";
    public const string CorsPolicyName = "VrindayaCorsPolicy";
    public const string DefaultApiVersion = "1.0";

    /// <summary>Root of Meta's Graph API — the versioned path/phone-number-id segment is appended per request.</summary>
    public const string WhatsAppGraphApiBaseUrl = "https://graph.facebook.com/";

    /// <summary>
    /// The single authorized admin account. Matches the literal already
    /// duplicated in firestore.rules'/storage.rules' isAdminUser() and
    /// web/'s AdminAuthService.ADMIN_EMAIL — keep all four in sync until
    /// the app migrates to a real multi-admin directory.
    /// </summary>
    public const string AdminEmail = "gsanketh7121@gmail.com";

    /// <summary>Policy name for [Authorize(Policy = ...)] on admin-only Product endpoints.</summary>
    public const string AdminOnlyPolicy = "AdminOnly";

    /// <summary>IMemoryCache key for the aggregated GET /homepage response — one fixed key since the content is public/global, not per-user.</summary>
    public const string HomepageCacheKey = "homepage:v1";

    /// <summary>IMemoryCache key for GET /brand-config — same reasoning as HomepageCacheKey (public/global, footer calls it on every page).</summary>
    public const string BrandConfigCacheKey = "brand-config:v1";

    /// <summary>IMemoryCache key for GET /marketplace-settings/flipkart — public/global, same reasoning as BrandConfigCacheKey.</summary>
    public const string FlipkartSettingsCacheKey = "flipkart-settings:v1";

    /// <summary>IMemoryCache key for GET /categories (active-only list) — public/global, same reasoning as BrandConfigCacheKey.</summary>
    public const string CategoriesActiveCacheKey = "categories:active:v1";

    /// <summary>IMemoryCache key for GET /collections (active-only list) — public/global, same reasoning as BrandConfigCacheKey.</summary>
    public const string CollectionsActiveCacheKey = "collections:active:v1";

    /// <summary>IMemoryCache key prefix for a single collection's public landing page (GET /collections/{slug}) — one entry per slug, admin requests always bypass this cache since they can see inactive/draft collections.</summary>
    public const string CollectionLandingCacheKeyPrefix = "collection:landing:v1:";

    /// <summary>Content types accepted by every image upload endpoint (Product images, Homepage assets).</summary>
    public static readonly HashSet<string> AllowedImageContentTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "image/jpeg", "image/png", "image/webp",
    };
}
