namespace Vrindaya.Api.Interfaces;

/// <summary>
/// Image upload/delete for Marketing/Campaign media (campaign images,
/// campaign thumbnails). Mirrors IProductStorageService/IHomepageStorageService
/// exactly — same compression pipeline, same idempotent-delete semantics —
/// just a different top-level folder ("marketing/") and no product-id
/// concept. Video/document campaign uploads are out of scope (still served
/// via the pre-existing client-side path) — see MarketingAssetsController's
/// doc comment.
/// </summary>
public interface IMarketingStorageService
{
    /// <summary>Compresses/converts then uploads to marketing/{section}/. fileName is optional; null falls back to a generated GUID.</summary>
    Task<(string Url, string PublicId)> UploadImageAsync(string section, Stream fileStream, string? fileName, CancellationToken cancellationToken);

    /// <summary>Deletes one image by its Cloudinary public id. Idempotent — a not-found asset is treated as already-deleted, not an error.</summary>
    Task DeleteImageAsync(string publicId, CancellationToken cancellationToken);
}
