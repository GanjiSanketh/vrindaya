using System.Text.Json.Serialization;

namespace Vrindaya.Api.AI.Core.Providers.Gemini.Models;

/// <summary>
/// Request payload for the Gemini "generateContent" REST endpoint. Matches the
/// GenerateContentRequest object of the Google Generative REST API.
/// </summary>
public sealed class GeminiRequest
{
    /// <summary>
    /// Ordered conversation contents. The most recent content is the pending
    /// prompt; earlier entries provide context.
    /// </summary>
    [JsonPropertyName("contents")]
    public List<GeminiContent>? Contents { get; set; }

    /// <summary>Optional system instruction applied to the whole conversation.</summary>
    [JsonPropertyName("systemInstruction")]
    public GeminiContent? SystemInstruction { get; set; }

    /// <summary>Optional generation configuration (temperature, token cap, etc.).</summary>
    [JsonPropertyName("generationConfig")]
    public GeminiGenerationConfig? GenerationConfig { get; set; }
}

/// <summary>
/// Generation control parameters for a <see cref="GeminiRequest"/>. Mirrors
/// the "GenerationConfig" object of the Google Generative REST API. Null
/// members are omitted on the wire; the API fills in its own defaults.
/// </summary>
public sealed class GeminiGenerationConfig
{
    /// <summary>Controls randomness of the output (0.0 – 2.0).</summary>
    [JsonPropertyName("temperature")]
    public double? Temperature { get; set; }

    /// <summary>Nucleus sampling probability mass (0.0 – 1.0).</summary>
    [JsonPropertyName("topP")]
    public double? TopP { get; set; }

    /// <summary>Top-k sampling — number of most-likely tokens to consider.</summary>
    [JsonPropertyName("topK")]
    public int? TopK { get; set; }

    /// <summary>Maximum number of output tokens to generate.</summary>
    [JsonPropertyName("maxOutputTokens")]
    public int? MaxOutputTokens { get; set; }

    /// <summary>Comma-separated list of stop sequences.</summary>
    [JsonPropertyName("stopSequences")]
    public List<string>? StopSequences { get; set; }

    /// <summary>
    /// Optional MIME type the model is asked to emit (e.g. "application/json").
    /// </summary>
    [JsonPropertyName("responseMimeType")]
    public string? ResponseMimeType { get; set; }
}