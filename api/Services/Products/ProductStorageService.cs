using Vrindaya.Api.Interfaces;

namespace Vrindaya.Api.Services.Products;

/// <summary>
/// Product image upload/delete. Deliberately never touches Firestore —
/// upload works against a productId before the product document exists
/// (see the plan's upload-first flow). Order/position in the gallery is
/// entirely an Angular/Firestore concern (see ProductImageDto.Order) — this
/// service only ever deals with individual files. The actual Cloudinary
/// calls live in ICloudinaryService (shared with HomepageStorageService);
/// this service owns only the products/{productId} folder convention, the
/// compression step, and public-id-ownership validation on delete.
/// </summary>
public class ProductStorageService : IProductStorageService
{
    private readonly ICloudinaryService _cloudinaryService;
    private readonly IImageCompressionService _compressionService;
    private readonly ILogger<ProductStorageService> _logger;

    public ProductStorageService(
        ICloudinaryService cloudinaryService,
        IImageCompressionService compressionService,
        ILogger<ProductStorageService> logger)
    {
        _cloudinaryService = cloudinaryService;
        _compressionService = compressionService;
        _logger = logger;
    }

    public async Task<(string Url, string PublicId)> UploadImageAsync(string productId, Stream fileStream, string? fileName, CancellationToken cancellationToken)
    {
        var compressed = await _compressionService.CompressAsync(fileStream, cancellationToken);
        var result = await _cloudinaryService.UploadImageAsync(
            $"products/{productId}", compressed.Bytes, compressed.ContentType, compressed.Extension, fileName, cancellationToken);
        return (result.SecureUrl, result.PublicId);
    }

    public async Task<List<(string Url, string PublicId)>> UploadMultipleImagesAsync(
        string productId, IReadOnlyList<(Stream Stream, string? FileName)> files, CancellationToken cancellationToken)
    {
        _logger.LogInformation("Uploading {Count} image(s) for product {ProductId}", files.Count, productId);

        var compressedFiles = await Task.WhenAll(files.Select(async f =>
        {
            var compressed = await _compressionService.CompressAsync(f.Stream, cancellationToken);
            return (compressed.Bytes, compressed.ContentType, compressed.Extension, f.FileName);
        }));

        var results = await _cloudinaryService.UploadMultipleImagesAsync($"products/{productId}", compressedFiles, cancellationToken);
        return results.Select(r => (r.SecureUrl, r.PublicId)).ToList();
    }

    public async Task DeleteImageAsync(string productId, string publicId, CancellationToken cancellationToken)
    {
        // Defense against a caller passing an arbitrary/foreign public id —
        // this endpoint only ever deletes images that belong to the given product.
        if (!publicId.StartsWith($"products/{productId}/", StringComparison.Ordinal))
        {
            _logger.LogWarning(
                "Rejected delete request for a public id outside its product's folder. ProductId: {ProductId}, PublicId: {PublicId}",
                productId, publicId);
            throw new InvalidOperationException("The given image does not belong to this product.");
        }

        await _cloudinaryService.DeleteImageAsync(publicId, cancellationToken);
    }

    public async Task<List<(string Url, string PublicId)>> DuplicateImagesAsync(
        string sourceProductId, string destProductId, IReadOnlyList<(string PublicId, string Url)> sourceImages, CancellationToken cancellationToken)
    {
        if (sourceImages.Count == 0)
        {
            return [];
        }

        _logger.LogInformation(
            "Duplicating {Count} image(s) from product {SourceProductId} to {DestProductId}",
            sourceImages.Count, sourceProductId, destProductId);

        var copies = sourceImages.Select(image =>
        {
            var fileName = image.PublicId.Split('/')[^1];
            return _cloudinaryService.UploadFromUrlAsync($"products/{destProductId}", image.Url, fileName, cancellationToken);
        });

        var results = await Task.WhenAll(copies);
        return results.Select(r => (r.SecureUrl, r.PublicId)).ToList();
    }

    public async Task DeleteAllImagesAsync(string productId, IReadOnlyList<string> knownPublicIds, CancellationToken cancellationToken)
    {
        var folder = $"products/{productId}";

        foreach (var publicId in knownPublicIds)
        {
            await _cloudinaryService.DeleteImageAsync(publicId, cancellationToken);
        }

        var remaining = await _cloudinaryService.ListPublicIdsAsync(folder, cancellationToken);
        var orphans = remaining.Except(knownPublicIds, StringComparer.Ordinal).ToList();

        if (orphans.Count > 0)
        {
            _logger.LogWarning(
                "Found {Count} orphaned Cloudinary image(s) while permanently deleting product {ProductId}: {Orphans}",
                orphans.Count, productId, string.Join(", ", orphans));
        }

        foreach (var orphanPublicId in orphans)
        {
            await _cloudinaryService.DeleteImageAsync(orphanPublicId, cancellationToken);
        }
    }
}
