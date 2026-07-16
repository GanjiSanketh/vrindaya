namespace Vrindaya.Api.Interfaces;

/// <summary>
/// Image upload/delete for homepage CMS sections (hero banners,
/// promotional banners, categories, collections, footer banner, Instagram
/// images, brand). Mirrors IProductStorageService exactly — same
/// compression pipeline, same idempotent-delete semantics — just a
/// different path prefix and no product-id concept.
/// </summary>
public interface IHomepageStorageService
{
    /// <summary>Compresses/converts then uploads to homepage/{section}/. fileName is optional/position-based, used as the human-readable base of the generated public id; null falls back to a generated GUID.</summary>
    Task<(string Url, string PublicId)> UploadImageAsync(string section, Stream fileStream, string? fileName, CancellationToken cancellationToken);

    /// <summary>Compresses/converts and uploads every file concurrently to homepage/{section}/ — the batch counterpart of UploadImageAsync (e.g. adding several Instagram images at once).</summary>
    Task<List<(string Url, string PublicId)>> UploadMultipleImagesAsync(string section, IReadOnlyList<(Stream Stream, string? FileName)> files, CancellationToken cancellationToken);

    /// <summary>Deletes one image by its Cloudinary public id. Idempotent — a not-found asset is treated as already-deleted, not an error.</summary>
    Task DeleteImageAsync(string publicId, CancellationToken cancellationToken);
}
