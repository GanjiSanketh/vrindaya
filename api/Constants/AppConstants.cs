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
}
