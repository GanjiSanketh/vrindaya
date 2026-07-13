using System.Text.Json.Serialization;

namespace Vrindaya.Api.DTOs.WhatsApp;

/// <summary>
/// Deserialization target for Meta Graph API error bodies, e.g.:
/// <code>{ "error": { "message": "...", "type": "OAuthException", "code": 190, "error_subcode": 463, "fbtrace_id": "..." } }</code>
/// </summary>
public class MetaErrorResponse
{
    public MetaErrorDetail? Error { get; set; }
}

public class MetaErrorDetail
{
    public string? Message { get; set; }
    public string? Type { get; set; }
    public int? Code { get; set; }

    [JsonPropertyName("error_subcode")]
    public int? ErrorSubcode { get; set; }

    [JsonPropertyName("fbtrace_id")]
    public string? FbTraceId { get; set; }
}
