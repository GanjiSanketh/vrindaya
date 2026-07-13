namespace Vrindaya.Api.DTOs.WhatsApp;

/// <summary>
/// Outcome of a single Meta WhatsApp API call — the boundary type between
/// <see cref="Vrindaya.Api.Interfaces.IWhatsAppProvider"/> (the only thing
/// that knows Meta's wire format) and WhatsAppService (which does not).
/// </summary>
public class WhatsAppSendResult
{
    public bool Success { get; set; }

    /// <summary>Meta's WhatsApp message ID, present only on success.</summary>
    public string? MessageId { get; set; }

    /// <summary>Human-readable summary, present only on failure.</summary>
    public string? ErrorMessage { get; set; }

    /// <summary>Meta's raw error detail or exception message, present only on failure.</summary>
    public string? ErrorDetails { get; set; }
}
