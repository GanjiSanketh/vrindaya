using System.Text.Json.Serialization;

namespace Vrindaya.Api.AI.Core.Providers.Gemini.Models;

/// <summary>
/// Error payload returned by the Google Generative REST API on a non-2xx
/// response. Mirrors the "Status" envelope the API wraps every failure in, so
/// the reason can be surfaced in an exception message instead of a bare status
/// code.
/// </summary>
public sealed class GeminiErrorResponse
{
    [JsonPropertyName("error")]
    public GeminiErrorDetail? Error { get; set; }
}

/// <summary>
/// The error body itself. <see cref="Message"/> is the human-readable reason
/// (e.g. "API key not valid"), <see cref="Status"/> the canonical code
/// (e.g. "INVALID_ARGUMENT", "RESOURCE_EXHAUSTED").
/// </summary>
public sealed class GeminiErrorDetail
{
    [JsonPropertyName("code")]
    public int Code { get; set; }

    [JsonPropertyName("message")]
    public string? Message { get; set; }

    [JsonPropertyName("status")]
    public string? Status { get; set; }
}
