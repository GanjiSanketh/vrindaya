using Vrindaya.Api.DTOs.WhatsApp;

namespace Vrindaya.Api.Interfaces;

/// <summary>
/// Meta-agnostic contract for sending WhatsApp messages. WhatsAppService and
/// CampaignService depend only on this interface — MetaWhatsAppProvider
/// (Services/WhatsApp) is the only class in the application that knows
/// Meta's Graph API wire format, URL structure, or auth scheme. Swapping
/// providers (a mock for tests, a different vendor) means implementing this
/// interface — nothing else in the app changes.
/// </summary>
public interface IWhatsAppProvider
{
    Task<WhatsAppSendResult> SendTextMessageAsync(string phoneNumber, string message, CancellationToken cancellationToken = default);

    Task<WhatsAppSendResult> SendTemplateMessageAsync(string phoneNumber, string templateName, CancellationToken cancellationToken = default);

    Task<WhatsAppSendResult> SendImageMessageAsync(string phoneNumber, string imageUrl, string? caption, CancellationToken cancellationToken = default);

    Task<WhatsAppSendResult> SendVideoMessageAsync(string phoneNumber, string videoUrl, string? caption, CancellationToken cancellationToken = default);

    Task<WhatsAppSendResult> SendDocumentMessageAsync(string phoneNumber, string documentUrl, string? caption, string? filename, CancellationToken cancellationToken = default);
}
