namespace Vrindaya.Api.Constants;

public static class AppConstants
{
    public const string ApplicationName = "Vrindaya API";
    public const string ApplicationVersion = "1.0.0";
    public const string CorsPolicyName = "VrindayaCorsPolicy";
    public const string DefaultApiVersion = "1.0";
    public const string AdminOnlyPolicy = "AdminOnly";
    public const string CategoriesActiveCacheKey = "categories:active:v1";

    public static readonly HashSet<string> AllowedImageContentTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "image/jpeg", "image/png", "image/webp",
    };
}
