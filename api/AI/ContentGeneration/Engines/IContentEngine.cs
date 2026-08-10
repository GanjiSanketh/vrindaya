using Vrindaya.Api.AI.ContentGeneration.DTOs;

namespace Vrindaya.Api.AI.ContentGeneration.Engines;

/// <summary>
/// Deterministic content scoring engine. Ranks the request's product pool for
/// content worthiness — fully deterministic, no randomness.
/// </summary>
public interface IContentEngine
{
    /// <summary>
    /// Ranks the supplied product pool into base content pieces, ordered by
    /// score (descending) and capped at the request's <see cref="ContentGenerationRequestDto.MaximumPieces"/>.
    /// </summary>
    ContentGenerationResponseDto Generate(ContentGenerationRequestDto request);
}