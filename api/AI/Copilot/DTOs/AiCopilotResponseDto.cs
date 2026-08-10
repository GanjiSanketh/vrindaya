namespace Vrindaya.Api.AI.Copilot.DTOs;

/// <summary>
/// Result returned by the AI copilot — the conversational reply plus the
/// actionable follow-ups, routing hint and any generated payload.
/// </summary>
public class AiCopilotResponseDto
{
    /// <summary>Conversational reply shown to the operator.</summary>
    public string Response { get; set; } = string.Empty;

    /// <summary>Ordered follow-up actions the operator can take next.</summary>
    public List<string> SuggestedActions { get; set; } = new();

    /// <summary>Module the copilot recommends navigating to (e.g. "campaigns", "products").</summary>
    public string RecommendedModule { get; set; } = string.Empty;

    /// <summary>Optional payload produced by a downstream module (campaign, content, recommendations).</summary>
    public object? GeneratedContent { get; set; }

    /// <summary>Confidence in the reply, 0-100.</summary>
    public double ConfidenceScore { get; set; }
}
