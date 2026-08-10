using System.Text.Json.Serialization;

namespace Vrindaya.Api.AI.Core.Providers.Gemini.Models;

/// <summary>
/// Response payload returned by the Gemini "generateContent" REST endpoint.
/// Matches the GenerateContentResponse structure of the Google Generative
/// REST API.
/// </summary>
public sealed class GeminiResponse
{
    /// <summary>Candidate responses, in ranking order (typically one).</summary>
    [JsonPropertyName("candidates")]
    public List<GeminiCandidate>? Candidates { get; set; }

    /// <summary>Safety feedback from the prompt filter, when applicable.</summary>
    [JsonPropertyName("promptFeedback")]
    public GeminiPromptFeedback? PromptFeedback { get; set; }

    /// <summary>Token accounting for the request and response.</summary>
    [JsonPropertyName("usageMetadata")]
    public GeminiUsageMetadata? UsageMetadata { get; set; }
}

/// <summary>
/// A single generated response candidate. Mirrors the "Candidate" object of
/// the Google Generative REST API.
/// </summary>
public sealed class GeminiCandidate
{
    /// <summary>The generated content block.</summary>
    [JsonPropertyName("content")]
    public GeminiContent? Content { get; set; }

    /// <summary>Reason generation stopped (e.g. "STOP", "MAX_TOKENS").</summary>
    [JsonPropertyName("finishReason")]
    public string? FinishReason { get; set; }

    /// <summary>Index of this candidate in the response list.</summary>
    [JsonPropertyName("index")]
    public int Index { get; set; }

    /// <summary>Safety ratings assessed for this candidate.</summary>
    [JsonPropertyName("safetyRatings")]
    public List<GeminiSafetyRating>? SafetyRatings { get; set; }

    /// <summary>Source attribution when ground-truth data was used.</summary>
    [JsonPropertyName("citationMetadata")]
    public GeminiCitationMetadata? CitationMetadata { get; set; }
}

/// <summary>
/// Safety filtering feedback for a prompt or candidate. Mirrors the
/// "SafetyRating" object of the Google Generative REST API.
/// </summary>
public sealed class GeminiSafetyRating
{
    /// <summary>The safety category evaluated.</summary>
    [JsonPropertyName("category")]
    public string? Category { get; set; }

    /// <summary>Safety probability assigned (e.g. "NEGLIGIBLE", "LOW").</summary>
    [JsonPropertyName("probability")]
    public string? Probability { get; set; }

    /// <summary>Whether this rating blocked the prompt or candidate.</summary>
    [JsonPropertyName("blocked")]
    public bool? Blocked { get; set; }
}

/// <summary>
/// Token usage accounting for a generateContent round trip. Mirrors the
/// "UsageMetadata" object of the Google Generative REST API.
/// </summary>
public sealed class GeminiUsageMetadata
{
    [JsonPropertyName("promptTokenCount")]
    public int PromptTokenCount { get; set; }

    [JsonPropertyName("candidatesTokenCount")]
    public int CandidatesTokenCount { get; set; }

    [JsonPropertyName("totalTokenCount")]
    public int TotalTokenCount { get; set; }
}

/// <summary>
/// Citation/training-data attribution for a generated candidate. Mirrors the
/// "CitationMetadata" object of the Google Generative REST API.
/// </summary>
public sealed class GeminiCitationMetadata
{
    [JsonPropertyName("citations")]
    public List<GeminiCitation>? Citations { get; set; }
}

/// <summary>
/// A single attribution source reference. Mirrors the "Citation" object of the
/// Google Generative REST API.
/// </summary>
public sealed class GeminiCitation
{
    [JsonPropertyName("startIndex")]
    public int? StartIndex { get; set; }

    [JsonPropertyName("endIndex")]
    public int? EndIndex { get; set; }

    [JsonPropertyName("uri")]
    public string? Uri { get; set; }

    [JsonPropertyName("title")]
    public string? Title { get; set; }
}

/// <summary>
/// Prompt-level safety filter feedback. Mirrors the "PromptFeedback" object of
/// the Google Generative REST API.
/// </summary>
public sealed class GeminiPromptFeedback
{
    /// <summary>Suggestion on how to fix a blocking filter issue.</summary>
    [JsonPropertyName("blockReason")]
    public string? BlockReason { get; set; }

    /// <summary>Safety ratings for the whole prompt.</summary>
    [JsonPropertyName("safetyRatings")]
    public List<GeminiSafetyRating>? SafetyRatings { get; set; }
}