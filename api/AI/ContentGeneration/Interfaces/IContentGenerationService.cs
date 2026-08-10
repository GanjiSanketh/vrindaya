using Vrindaya.Api.AI.ContentGeneration.DTOs;

namespace Vrindaya.Api.AI.ContentGeneration.Interfaces;

/// <summary>
/// Content generation service — orchestrates the engine, validates input, and
/// provides a single entry point for consumers.
/// </summary>
public interface IContentGenerationService
{
    /// <summary>
    /// Generates platform-ready content pieces for the supplied request.
    /// </summary>
    /// <param name="request">Generation parameters (format, tone, audience, filters, product pool).</param>
    /// <param name="cancellationToken">Optional cancellation token.</param>
    /// <returns>A response containing the ordered content pieces plus metadata.</returns>
    /// <exception cref="ArgumentNullException">Thrown when <paramref name="request"/> is null.</exception>
    /// <exception cref="ArgumentException">Thrown when <see cref="ContentGenerationRequestDto.MaximumPieces"/> is less than 1.</exception>
    Task<ContentGenerationResponseDto> GenerateAsync(
        ContentGenerationRequestDto request,
        CancellationToken cancellationToken = default);
}