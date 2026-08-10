using Vrindaya.Api.AI.Suggestions.Models;

namespace Vrindaya.Api.AI.Suggestions.DTOs;

/// <summary>
/// A single actionable business suggestion. Every field is derived from an
/// existing intelligence engine's output by a deterministic rule — no AI
/// provider, no randomness.
/// </summary>
public sealed class AiSuggestionDto
{
    public string ProductId { get; set; } = string.Empty;

    public string ProductName { get; set; } = string.Empty;

    public string Category { get; set; } = string.Empty;

    /// <summary>Business area this suggestion belongs to.</summary>
    public SuggestionCategory Type { get; set; }

    /// <summary>Urgency band used for ordering.</summary>
    public SuggestionSeverity Severity { get; set; }

    /// <summary>Short headline describing the suggestion.</summary>
    public string Title { get; set; } = string.Empty;

    /// <summary>Why the rule fired, stated in the engine's own metrics.</summary>
    public string Rationale { get; set; } = string.Empty;

    /// <summary>The concrete step the operator should take.</summary>
    public string RecommendedAction { get; set; } = string.Empty;

    /// <summary>Ranking signal (0-100). Higher means act sooner.</summary>
    public int Impact { get; set; }

    /// <summary>Engine metric that triggered the rule, for display alongside the suggestion.</summary>
    public Dictionary<string, string> Metrics { get; set; } = [];
}
