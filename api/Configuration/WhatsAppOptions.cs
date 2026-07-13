namespace Vrindaya.Api.Configuration;

/// <summary>
/// Strongly typed binding for the "WhatsApp" configuration section — Meta
/// WhatsApp Business (Cloud API) credentials and settings. Populated via
/// appsettings or environment variables (WhatsApp__AccessToken, etc.), which
/// override the matching JSON value automatically in any environment.
/// </summary>
public class WhatsAppOptions
{
    public const string SectionName = "WhatsApp";

    /// <summary>Permanent or system-user access token. Never logged, never returned by any endpoint.</summary>
    public string AccessToken { get; set; } = string.Empty;

    /// <summary>Meta's Phone Number ID for the sending number — not a secret, safe to expose (e.g. in /whatsapp/health).</summary>
    public string PhoneNumberId { get; set; } = string.Empty;

    /// <summary>WhatsApp Business Account ID (WABA ID).</summary>
    public string BusinessAccountId { get; set; } = string.Empty;

    /// <summary>Shared secret this app expects back from Meta during webhook subscription verification (GET /whatsapp/webhook).</summary>
    public string VerifyToken { get; set; } = string.Empty;

    /// <summary>Graph API version segment, e.g. "v23.0".</summary>
    public string ApiVersion { get; set; } = "v23.0";
}
