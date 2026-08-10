using Microsoft.Extensions.Logging;
using Vrindaya.Api.AI.ContentGeneration.DTOs;
using Vrindaya.Api.AI.ContentGeneration.Engines;
using Vrindaya.Api.AI.ContentGeneration.Interfaces;

namespace Vrindaya.Api.AI.ContentGeneration.Services;

/// <summary>
/// Default <see cref="IContentGenerationService"/>. Validates the request,
/// scores the product pool with the <see cref="IContentEngine"/>, then enriches
/// the scored pieces with rich copy through the
/// <see cref="IContentGenerationProvider"/>.
/// </summary>
public sealed class ContentGenerationService : IContentGenerationService
{
    private readonly IContentEngine _engine;
    private readonly IContentGenerationProvider _provider;
    private readonly ILogger<ContentGenerationService> _logger;

    public ContentGenerationService(
        IContentEngine engine,
        IContentGenerationProvider provider,
        ILogger<ContentGenerationService> logger)
    {
        _engine = engine ?? throw new ArgumentNullException(nameof(engine));
        _provider = provider ?? throw new ArgumentNullException(nameof(provider));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public async Task<ContentGenerationResponseDto> GenerateAsync(
        ContentGenerationRequestDto request,
        CancellationToken cancellationToken = default)
    {
        if (request is null)
            throw new ArgumentNullException(nameof(request));

        if (request.MaximumPieces < 1)
            throw new ArgumentException(
                "MaximumPieces must be at least 1.", nameof(request));

        if (request.MaximumPieces > ContentGenerationConstants.MaxPiecesLimit)
        {
            _logger.LogWarning(
                "Requested {Requested} content pieces; clamping to the limit of {Limit}.",
                request.MaximumPieces, ContentGenerationConstants.MaxPiecesLimit);
            request.MaximumPieces = ContentGenerationConstants.MaxPiecesLimit;
        }

        _logger.LogInformation(
            "Content generation starting for format {Format} — scoring candidate products.",
            request.ContentType);

        var baseResponse = _engine.Generate(request);

        _logger.LogInformation(
            "Content generation: {TotalPieces} scored pieces ready; delegating to the content provider.",
            baseResponse.TotalPieces);

        var response = await _provider.GenerateAsync(request, baseResponse.Pieces, cancellationToken);

        _logger.LogInformation(
            "Content generation complete: {TotalPieces} pieces returned for format {Format}.",
            response.TotalPieces, request.ContentType);

        return response;
    }
}