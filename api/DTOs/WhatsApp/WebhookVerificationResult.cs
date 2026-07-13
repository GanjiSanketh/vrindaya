namespace Vrindaya.Api.DTOs.WhatsApp;

/// <summary>
/// Outcome of Meta's webhook subscription handshake (GET /whatsapp/webhook).
/// </summary>
public class WebhookVerificationResult
{
    public bool IsVerified { get; set; }

    /// <summary>The "hub.challenge" value to echo back — set only when IsVerified is true.</summary>
    public string? Challenge { get; set; }
}
