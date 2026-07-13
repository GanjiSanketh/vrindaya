using System.Diagnostics;
using System.Net.Http.Headers;
using System.Text.Json;
using Microsoft.Extensions.Options;
using Vrindaya.Api.Configuration;
using Vrindaya.Api.DTOs.WhatsApp;
using Vrindaya.Api.Interfaces;

namespace Vrindaya.Api.Services.WhatsApp;

/// <summary>
/// The only class in the application that talks to Meta's WhatsApp Cloud
/// API. Everything Meta-specific — the URL shape, the JSON payload shape,
/// bearer auth, error parsing — is encapsulated here. Callers depend on
/// <see cref="IWhatsAppProvider"/> and never see any of this.
///
/// The HttpClient is injected by IHttpClientFactory (registered as a typed
/// client in ServiceCollectionExtensions.AddWhatsAppIntegration) rather than
/// constructed directly, so socket/connection reuse and pooling are handled
/// by the factory instead of this class.
/// </summary>
public class MetaWhatsAppProvider : IWhatsAppProvider
{
    private const string MessagingProduct = "whatsapp";
    private const string TextMessageType = "text";
    private const string TemplateMessageType = "template";
    private const string ImageMessageType = "image";
    private const string VideoMessageType = "video";
    private const string DocumentMessageType = "document";

    private static readonly JsonSerializerOptions SerializerOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true,
        DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull,
    };

    private readonly HttpClient _httpClient;
    private readonly WhatsAppOptions _options;
    private readonly ILogger<MetaWhatsAppProvider> _logger;

    public MetaWhatsAppProvider(HttpClient httpClient, IOptions<WhatsAppOptions> options, ILogger<MetaWhatsAppProvider> logger)
    {
        _httpClient = httpClient;
        _options = options.Value;
        _logger = logger;
    }

    public Task<WhatsAppSendResult> SendTextMessageAsync(string phoneNumber, string message, CancellationToken cancellationToken = default)
    {
        var payload = new MetaSendMessageRequest
        {
            MessagingProduct = MessagingProduct,
            To = phoneNumber,
            Type = TextMessageType,
            Text = new MetaTextPayload { Body = message },
        };

        return SendAsync(payload, phoneNumber, cancellationToken);
    }

    public Task<WhatsAppSendResult> SendTemplateMessageAsync(string phoneNumber, string templateName, CancellationToken cancellationToken = default)
    {
        var payload = new MetaSendMessageRequest
        {
            MessagingProduct = MessagingProduct,
            To = phoneNumber,
            Type = TemplateMessageType,
            Template = new MetaTemplatePayload { Name = templateName },
        };

        return SendAsync(payload, phoneNumber, cancellationToken);
    }

    public Task<WhatsAppSendResult> SendImageMessageAsync(string phoneNumber, string imageUrl, string? caption, CancellationToken cancellationToken = default)
    {
        var payload = new MetaSendMessageRequest
        {
            MessagingProduct = MessagingProduct,
            To = phoneNumber,
            Type = ImageMessageType,
            Image = new MetaMediaPayload { Link = imageUrl, Caption = caption },
        };

        return SendAsync(payload, phoneNumber, cancellationToken);
    }

    public Task<WhatsAppSendResult> SendVideoMessageAsync(string phoneNumber, string videoUrl, string? caption, CancellationToken cancellationToken = default)
    {
        var payload = new MetaSendMessageRequest
        {
            MessagingProduct = MessagingProduct,
            To = phoneNumber,
            Type = VideoMessageType,
            Video = new MetaMediaPayload { Link = videoUrl, Caption = caption },
        };

        return SendAsync(payload, phoneNumber, cancellationToken);
    }

    public Task<WhatsAppSendResult> SendDocumentMessageAsync(string phoneNumber, string documentUrl, string? caption, string? filename, CancellationToken cancellationToken = default)
    {
        var payload = new MetaSendMessageRequest
        {
            MessagingProduct = MessagingProduct,
            To = phoneNumber,
            Type = DocumentMessageType,
            Document = new MetaMediaPayload { Link = documentUrl, Caption = caption, Filename = filename },
        };

        return SendAsync(payload, phoneNumber, cancellationToken);
    }

    private async Task<WhatsAppSendResult> SendAsync(MetaSendMessageRequest payload, string phoneNumber, CancellationToken cancellationToken)
    {
        var requestUri = $"{_options.ApiVersion}/{_options.PhoneNumberId}/messages";
        var stopwatch = Stopwatch.StartNew();

        using var request = new HttpRequestMessage(HttpMethod.Post, requestUri)
        {
            Content = JsonContent.Create(payload, options: SerializerOptions),
        };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _options.AccessToken);

        _logger.LogInformation(
            "Sending WhatsApp {MessageType} message. PhoneNumber: {PhoneNumber}",
            payload.Type, phoneNumber);

        try
        {
            using var response = await _httpClient.SendAsync(request, cancellationToken);
            var responseBody = await response.Content.ReadAsStringAsync(cancellationToken);
            stopwatch.Stop();

            if (response.IsSuccessStatusCode)
            {
                var metaResponse = JsonSerializer.Deserialize<MetaSendMessageResponse>(responseBody, SerializerOptions);
                var messageId = metaResponse?.Messages?.FirstOrDefault()?.Id;

                _logger.LogInformation(
                    "Meta accepted WhatsApp message. PhoneNumber: {PhoneNumber}, MessageId: {MessageId}, DurationMs: {DurationMs}, MetaResponse: {MetaResponse}",
                    phoneNumber, messageId, stopwatch.ElapsedMilliseconds, responseBody);

                return new WhatsAppSendResult { Success = true, MessageId = messageId };
            }

            var metaError = TryDeserializeError(responseBody);

            _logger.LogWarning(
                "Meta rejected WhatsApp message. PhoneNumber: {PhoneNumber}, StatusCode: {StatusCode}, DurationMs: {DurationMs}, MetaResponse: {MetaResponse}",
                phoneNumber, (int)response.StatusCode, stopwatch.ElapsedMilliseconds, responseBody);

            return new WhatsAppSendResult
            {
                Success = false,
                ErrorMessage = "Meta API rejected the request.",
                ErrorDetails = metaError?.Error?.Message ?? responseBody,
            };
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException or JsonException)
        {
            stopwatch.Stop();

            _logger.LogError(
                ex,
                "Unable to reach the Meta WhatsApp API. PhoneNumber: {PhoneNumber}, DurationMs: {DurationMs}",
                phoneNumber, stopwatch.ElapsedMilliseconds);

            return new WhatsAppSendResult
            {
                Success = false,
                ErrorMessage = "Unable to reach the Meta WhatsApp API.",
                ErrorDetails = ex.Message,
            };
        }
    }

    private static MetaErrorResponse? TryDeserializeError(string responseBody)
    {
        try
        {
            return JsonSerializer.Deserialize<MetaErrorResponse>(responseBody, SerializerOptions);
        }
        catch (JsonException)
        {
            return null;
        }
    }
}
