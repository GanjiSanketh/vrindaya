using Microsoft.Extensions.Options;
using Vrindaya.Api.Configuration;
using Vrindaya.Api.DTOs.WhatsApp;
using Vrindaya.Api.Interfaces;

namespace Vrindaya.Api.Services;

/// <summary>
/// Application-facing WhatsApp operations. Deliberately Meta-agnostic — it
/// only ever calls <see cref="IWhatsAppProvider"/> and translates the result
/// into this app's own response shapes. If the provider is ever swapped
/// (a different vendor, a mock for tests), nothing here changes.
/// </summary>
public class WhatsAppService : IWhatsAppService
{
    private readonly IWhatsAppProvider _whatsAppProvider;
    private readonly WhatsAppOptions _options;
    private readonly ILogger<WhatsAppService> _logger;

    public WhatsAppService(IWhatsAppProvider whatsAppProvider, IOptions<WhatsAppOptions> options, ILogger<WhatsAppService> logger)
    {
        _whatsAppProvider = whatsAppProvider;
        _options = options.Value;
        _logger = logger;
    }

    public async Task<SendMessageResponse> SendTestMessageAsync(SendMessageRequest request, CancellationToken cancellationToken = default)
    {
        var result = await _whatsAppProvider.SendTextMessageAsync(request.PhoneNumber, request.Message, cancellationToken);

        return result.Success
            ? new SendMessageResponse { Success = true, Message = "Message sent successfully.", MessageId = result.MessageId }
            : new SendMessageResponse
            {
                Success = false,
                Message = result.ErrorMessage ?? "Meta API rejected the request.",
                Details = result.ErrorDetails,
            };
    }

    /// <summary>
    /// Reports whether the required Meta credentials are present — not
    /// whether Meta will actually accept them. A live Graph API call on
    /// every health check would burn rate-limit budget and add latency for
    /// no real benefit here; POST /whatsapp/test is the real connectivity check.
    /// </summary>
    public WhatsAppHealthDto GetHealthStatus()
    {
        var isConfigured = !string.IsNullOrWhiteSpace(_options.AccessToken)
            && !string.IsNullOrWhiteSpace(_options.PhoneNumberId);

        return new WhatsAppHealthDto
        {
            ConnectionStatus = isConfigured ? "Configured" : "NotConfigured",
            PhoneNumberId = _options.PhoneNumberId,
            ApiVersion = _options.ApiVersion,
        };
    }

    public WebhookVerificationResult VerifyWebhookSubscription(string? mode, string? verifyToken, string? challenge)
    {
        var isVerified = string.Equals(mode, "subscribe", StringComparison.Ordinal)
            && !string.IsNullOrEmpty(_options.VerifyToken)
            && string.Equals(verifyToken, _options.VerifyToken, StringComparison.Ordinal)
            && !string.IsNullOrEmpty(challenge);

        if (!isVerified)
        {
            _logger.LogWarning("WhatsApp webhook verification failed. Mode: {Mode}", mode);
            return new WebhookVerificationResult { IsVerified = false };
        }

        _logger.LogInformation("WhatsApp webhook verified successfully.");
        return new WebhookVerificationResult { IsVerified = true, Challenge = challenge };
    }

    /// <summary>
    /// Records an incoming webhook event for visibility only — see
    /// docs/marketing/whatsapp-integration-plan.md for why processing
    /// (updating campaignQueue delivery status, etc.) isn't implemented yet.
    /// </summary>
    public void RecordWebhookEvent(string payload)
    {
        _logger.LogInformation("WhatsApp webhook event received: {WebhookPayload}", payload);
    }
}
