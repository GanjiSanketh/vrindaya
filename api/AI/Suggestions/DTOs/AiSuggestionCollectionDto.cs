using Vrindaya.Api.AI.Suggestions.Models;

namespace Vrindaya.Api.AI.Suggestions.DTOs;

/// <summary>
/// Aggregate suggestion result — the ordered suggestion list plus per-category
/// and per-severity counts.
/// </summary>
public sealed class AiSuggestionCollectionDto
{
    /// <summary>Suggestions ordered by severity, then impact descending.</summary>
    public List<AiSuggestionDto> Suggestions { get; set; } = [];

    public int TotalSuggestions { get; set; }

    public int TotalProductsAnalyzed { get; set; }

    /// <summary>Suggestion count per business area.</summary>
    public Dictionary<SuggestionCategory, int> CountByCategory { get; set; } = [];

    /// <summary>Suggestion count per urgency band.</summary>
    public Dictionary<SuggestionSeverity, int> CountBySeverity { get; set; } = [];

    public DateTime GeneratedAt { get; set; }
}
