using Vrindaya.Api.DTOs.WhatsApp;

namespace Vrindaya.Api.Interfaces;

/// <summary>
/// Application-facing WhatsApp operations. This contract knows nothing
/// about Meta — it depends only on <see cref="IWhatsAppProvider"/> for the
/// actual send. WhatsAppController depends on this, never on the provider
/// directly.
/// </summary>
public interface IWhatsAppService
{
    Task<SendMessageResponse> SendTestMessageAsync(SendMessageRequest request, CancellationToken cancellationToken = default);

    WhatsAppHealthDto GetHealthStatus();

    WebhookVerificationResult VerifyWebhookSubscription(string? mode, string? verifyToken, string? challenge);

    void RecordWebhookEvent(string payload);
}
