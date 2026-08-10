using Vrindaya.Api.AI.Flipkart.DTOs;

namespace Vrindaya.Api.AI.Flipkart.Interfaces;

/// <summary>
/// Service for generating Flipkart-specific AI assistance and optimization suggestions.
/// </summary>
public interface IFlipkartAiService
{
    /// <summary>
    /// Generates Flipkart optimization suggestions for the given request.
    /// </summary>
    /// <param name="request">The Flipkart assistance request.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Flipkart suggestions response.</returns>
    Task<FlipkartResponseDto> GenerateSuggestionsAsync(
        FlipkartRequestDto request,
        CancellationToken cancellationToken = default);
}