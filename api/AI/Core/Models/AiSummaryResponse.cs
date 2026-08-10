namespace Vrindaya.Api.AI.Core.Models;

/// <summary>
/// Strongly typed response for <see cref="Interfaces.IAiProvider.SummarizeAsync"/>.
/// Carries the generated text summary plus metadata about the summarized source.
/// </summary>
public sealed class AiSummaryResponse
{
    /// <summary>The generated summary text.</summary>
    public string Summary { get; init; } = string.Empty;

    /// <summary>Number of source items covered by the summary.</summary>
    public int TotalItems { get; init; }

    public DateTime GeneratedAt { get; init; } = DateTime.UtcNow;
}