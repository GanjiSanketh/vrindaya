using System.Text.Json.Serialization;
using Vrindaya.Api.AI.ContentGeneration.Models;

namespace Vrindaya.Api.AI.ContentGeneration.DTOs;

/// <summary>
/// Aggregated content generation result — the ordered piece list plus
/// generation metadata.
/// </summary>
public class ContentGenerationResponseDto
{
    /// <summary>Pieces ordered by Score descending.</summary>
    public List<ContentPieceDto> Pieces { get; set; } = new();

    public DateTime GeneratedAt { get; set; }

    public int TotalProductsAnalyzed { get; set; }

    public int TotalPieces { get; set; }
}