using Vrindaya.Api.Interfaces;

namespace Vrindaya.Api.Services.Homepage;

/// <summary>
/// See IHomepageStorageService. Mirrors ProductStorageService's upload/delete
/// pattern exactly — the actual Cloudinary calls live in ICloudinaryService,
/// this service owns only the homepage/{section} folder convention, the
/// compression step, and public-id-ownership validation on delete.
/// </summary>
public class HomepageStorageService : IHomepageStorageService
{
    private readonly ICloudinaryService _cloudinaryService;
    private readonly IImageCompressionService _compressionService;
    private readonly ILogger<HomepageStorageService> _logger;

    public HomepageStorageService(
        ICloudinaryService cloudinaryService,
        IImageCompressionService compressionService,
        ILogger<HomepageStorageService> logger)
    {
        _cloudinaryService = cloudinaryService;
        _compressionService = compressionService;
        _logger = logger;
    }

    public async Task<(string Url, string PublicId)> UploadImageAsync(string section, Stream fileStream, string? fileName, CancellationToken cancellationToken)
    {
        var compressed = await _compressionService.CompressAsync(fileStream, cancellationToken);
        var result = await _cloudinaryService.UploadImageAsync(
            $"homepage/{section}", compressed.Bytes, compressed.ContentType, compressed.Extension, fileName, cancellationToken);
        return (result.SecureUrl, result.PublicId);
    }

    public async Task<List<(string Url, string PublicId)>> UploadMultipleImagesAsync(
        string section, IReadOnlyList<(Stream Stream, string? FileName)> files, CancellationToken cancellationToken)
    {
        _logger.LogInformation("Uploading {Count} image(s) for homepage section {Section}", files.Count, section);

        var compressedFiles = await Task.WhenAll(files.Select(async f =>
        {
            var compressed = await _compressionService.CompressAsync(f.Stream, cancellationToken);
            return (compressed.Bytes, compressed.ContentType, compressed.Extension, f.FileName);
        }));

        var results = await _cloudinaryService.UploadMultipleImagesAsync($"homepage/{section}", compressedFiles, cancellationToken);
        return results.Select(r => (r.SecureUrl, r.PublicId)).ToList();
    }

    public async Task DeleteImageAsync(string publicId, CancellationToken cancellationToken)
    {
        if (!publicId.StartsWith("homepage/", StringComparison.Ordinal))
        {
            _logger.LogWarning("Rejected delete request for a public id outside homepage/. PublicId: {PublicId}", publicId);
            throw new InvalidOperationException("The given image is not a homepage asset.");
        }

        await _cloudinaryService.DeleteImageAsync(publicId, cancellationToken);
    }
}
