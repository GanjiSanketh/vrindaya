namespace Vrindaya.Api.DTOs.WhatsApp;

/// <summary>
/// Response shape for POST /api/v1/whatsapp/test — returned with 200 on
/// success, 502 if Meta rejected or could not be reached.
/// </summary>
public class SendMessageResponse
{
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;

    /// <summary>Meta's WhatsApp message ID (e.g. "wamid...."), present only on success.</summary>
    public string? MessageId { get; set; }

    /// <summary>Meta's own error message, or the exception message, present only on failure.</summary>
    public string? Details { get; set; }
}
