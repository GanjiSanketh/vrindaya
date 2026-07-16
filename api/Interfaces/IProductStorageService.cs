namespace Vrindaya.Api.Interfaces;

/// <summary>
/// Product image upload/delete via Cloudinary. Deliberately doesn't touch
/// Firestore at all — upload doesn't require the product document to exist
/// yet (see the plan's upload-first flow). Images are a free-form,
/// admin-orderable gallery (max 10, enforced by DTO validation, not here) —
/// this service has no notion of position/order, only of individual files.
/// </summary>
public interface IProductStorageService
{
    /// <summary>Compresses/converts then uploads to products/{productId}/. fileName is typically position-based ("cover", "image-2", ...) computed by the caller — used as the human-readable base of the generated public id; null falls back to a generated GUID.</summary>
    Task<(string Url, string PublicId)> UploadImageAsync(string productId, Stream fileStream, string? fileName, CancellationToken cancellationToken);

    /// <summary>Compresses/converts and uploads every file concurrently to products/{productId}/ — the batch counterpart of UploadImageAsync for admin flows that add several gallery images at once.</summary>
    Task<List<(string Url, string PublicId)>> UploadMultipleImagesAsync(string productId, IReadOnlyList<(Stream Stream, string? FileName)> files, CancellationToken cancellationToken);

    /// <summary>Deletes one image by its Cloudinary public id. Idempotent — a not-found asset is treated as already-deleted, not an error.</summary>
    Task DeleteImageAsync(string productId, string publicId, CancellationToken cancellationToken);

    /// <summary>Remote-fetch-copies every given source public id's image into the destination product's folder (Cloudinary re-uploads from the existing secure URL server-side — no bytes through this app), preserving each file's name — used by product duplication so the copy has its own independent images rather than sharing URLs with the source.</summary>
    Task<List<(string Url, string PublicId)>> DuplicateImagesAsync(string sourceProductId, string destProductId, IReadOnlyList<(string PublicId, string Url)> sourceImages, CancellationToken cancellationToken);

    /// <summary>Deletes every given (known, tracked) public id, then sweeps products/{productId}/ for anything left over — uploads that were never attached to the product, or that a best-effort delete elsewhere silently failed to remove — and deletes those too. Used by permanent deletion; never called by soft delete, which keeps all images.</summary>
    Task DeleteAllImagesAsync(string productId, IReadOnlyList<string> knownPublicIds, CancellationToken cancellationToken);
}
