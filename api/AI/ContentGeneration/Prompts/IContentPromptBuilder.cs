using Vrindaya.Api.AI.ContentGeneration.DTOs;

namespace Vrindaya.Api.AI.ContentGeneration.Prompts;

/// <summary>
/// Builds a single, optimized LLM prompt from a content generation request and
/// its scored pieces. Pure transformation — no AI calls, no business logic
/// beyond prompt assembly.
/// </summary>
public interface IContentPromptBuilder
{
    /// <summary>
    /// Builds a single LLM prompt from the content request context and scored pieces.
    /// </summary>
    string Build(
        ContentGenerationRequestDto? request,
        IReadOnlyList<ContentPieceDto>? pieces);
}