using System.Text.Json.Serialization;

namespace Vrindaya.Api.Services.WhatsApp;

/// <summary>
/// Meta Graph API wire-format models. Deliberately internal and confined to
/// this folder — they describe Meta's request/response shape, not our own
/// API contract, so they must never leak into DTOs/ or appear in Swagger.
/// </summary>
internal sealed class MetaSendMessageRequest
{
    [JsonPropertyName("messaging_product")]
    public string MessagingProduct { get; set; } = "whatsapp";

    public string To { get; set; } = string.Empty;

    public string Type { get; set; } = string.Empty;

    public MetaTextPayload? Text { get; set; }

    public MetaTemplatePayload? Template { get; set; }

    public MetaMediaPayload? Image { get; set; }

    public MetaMediaPayload? Video { get; set; }

    public MetaMediaPayload? Document { get; set; }
}

/// <summary>Shared shape for image/video/document messages — Meta's "link" media type (fetched by URL, not uploaded as bytes).</summary>
internal sealed class MetaMediaPayload
{
    public string Link { get; set; } = string.Empty;

    public string? Caption { get; set; }

    /// <summary>Only meaningful for document messages — Meta displays this as the file's name.</summary>
    public string? Filename { get; set; }
}

internal sealed class MetaTextPayload
{
    public string Body { get; set; } = string.Empty;
}

internal sealed class MetaTemplatePayload
{
    public string Name { get; set; } = string.Empty;

    public MetaLanguagePayload Language { get; set; } = new();
}

internal sealed class MetaLanguagePayload
{
    public string Code { get; set; } = "en_US";
}

internal sealed class MetaSendMessageResponse
{
    [JsonPropertyName("messaging_product")]
    public string? MessagingProduct { get; set; }

    public List<MetaMessageResult>? Messages { get; set; }
}

internal sealed class MetaMessageResult
{
    public string? Id { get; set; }
}
