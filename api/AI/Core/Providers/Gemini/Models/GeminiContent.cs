using System.Text.Json.Serialization;

namespace Vrindaya.Api.AI.Core.Providers.Gemini.Models;

/// <summary>
/// A single content block exchanged with the Gemini API. Used in both the
/// <see cref="GeminiRequest"/> (as user/model/system message content) and in
/// each <see cref="GeminiCandidate"/> of the <see cref="GeminiResponse"/>.
/// Mirrors the "Content" object of the Google Generative REST API.
/// </summary>
public sealed class GeminiContent
{
    /// <summary>Optional role for this content: "user", "model" or "system".</summary>
    [JsonPropertyName("role")]
    public string? Role { get; set; }

    /// <summary>Ordered parts the content is composed of (text, image data, etc.).</summary>
    [JsonPropertyName("parts")]
    public List<GeminiPart>? Parts { get; set; }
}

/// <summary>
/// A single part of <see cref="GeminiContent"/>. Mirrors the "Part" object of
/// the Google Generative REST API — a part carries one piece of payload, e.g.
/// text or raw media data.
/// </summary>
public sealed class GeminiPart
{
    /// <summary>Inline text payload of this part.</summary>
    [JsonPropertyName("text")]
    public string? Text { get; set; }

    /// <summary>Inline image/media payload of this part.</summary>
    [JsonPropertyName("inlineData")]
    public GeminiInlineData? InlineData { get; set; }
}

/// <summary>
/// Binary payload (e.g. an image) attached to a <see cref="GeminiPart"/>.
/// Mirrors the "InlineData" object of the Google Generative REST API.
/// </summary>
public sealed class GeminiInlineData
{
    /// <summary>MIME type of the data (e.g. "image/png").</summary>
    [JsonPropertyName("mimeType")]
    public string? MimeType { get; set; }

    /// <summary>Base64-encoded data payload.</summary>
    [JsonPropertyName("data")]
    public string? Data { get; set; }
}