namespace Vrindaya.Api.DTOs.WhatsApp;

/// <summary>
/// Response shape for GET /api/v1/whatsapp/health. Deliberately excludes
/// AccessToken/BusinessAccountId — this endpoint is safe to hit without
/// authentication (see WhatsAppController) and must never leak secrets.
/// </summary>
public class WhatsAppHealthDto
{
    /// <summary>"Configured" if the required credentials are present, "NotConfigured" otherwise. This checks configuration presence, not that Meta actually accepts the token.</summary>
    public string ConnectionStatus { get; set; } = string.Empty;

    public string PhoneNumberId { get; set; } = string.Empty;
    public string ApiVersion { get; set; } = string.Empty;
}
