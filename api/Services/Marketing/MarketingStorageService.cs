using Vrindaya.Api.Interfaces;

namespace Vrindaya.Api.Services.Marketing;

/// <summary>See IMarketingStorageService. Mirrors HomepageStorageService's upload/delete pattern exactly — the actual Cloudinary calls live in ICloudinaryService, this service owns only the marketing/{section} folder convention, the compression step, and public-id-ownership validation on delete.</summary>
public class MarketingStorageService : IMarketingStorageService
{
    private readonly ICloudinaryService _cloudinaryService;
    private readonly IImageCompressionService _compressionService;
    private readonly ILogger<MarketingStorageService> _logger;

    public MarketingStorageService(
        ICloudinaryService cloudinaryService,
        IImageCompressionService compressionService,
        ILogger<MarketingStorageService> logger)
    {
        _cloudinaryService = cloudinaryService;
        _compressionService = compressionService;
        _logger = logger;
    }

    public async Task<(string Url, string PublicId)> UploadImageAsync(string section, Stream fileStream, string? fileName, CancellationToken cancellationToken)
    {
        var compressed = await _compressionService.CompressAsync(fileStream, cancellationToken);
        var result = await _cloudinaryService.UploadImageAsync(
            $"marketing/{section}", compressed.Bytes, compressed.ContentType, compressed.Extension, fileName, cancellationToken);

        _logger.LogInformation("Uploaded marketing image. Section: {Section}, PublicId: {PublicId}", section, result.PublicId);
        return (result.SecureUrl, result.PublicId);
    }

    public async Task DeleteImageAsync(string publicId, CancellationToken cancellationToken)
    {
        if (!publicId.StartsWith("marketing/", StringComparison.Ordinal))
        {
            _logger.LogWarning("Rejected delete request for a public id outside marketing/. PublicId: {PublicId}", publicId);
            throw new InvalidOperationException("The given image is not a marketing asset.");
        }

        await _cloudinaryService.DeleteImageAsync(publicId, cancellationToken);
    }
}
