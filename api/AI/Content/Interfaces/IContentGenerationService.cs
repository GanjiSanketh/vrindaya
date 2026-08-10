using Vrindaya.Api.AI.Content.DTOs;

namespace Vrindaya.Api.AI.Content.Interfaces;

/// <summary>
/// Public-facing content generation service. Accepts a
/// <see cref="ContentGenerationRequest"/>, routes it through the AI
/// orchestrator (the hub-and-spoke module coordinator), and returns the
/// generated <see cref="ContentGenerationResponse"/>.
/// </summary>
public interface IContentGenerationService
{
    /// <summary>
    /// Generates a single content piece for the supplied request.
    /// </summary>
    /// <param name="request">Generation parameters (objective, audience, tone, platform, product pool, context).</param>
    /// <param name="cancellationToken">Optional cancellation token.</param>
    /// <returns>The generated content response.</returns>
    /// <exception cref="ArgumentNullException">Thrown when <paramref name="request"/> is null.</exception>
    Task<ContentGenerationResponse> GenerateAsync(
        ContentGenerationRequest request,
        CancellationToken cancellationToken = default);
}