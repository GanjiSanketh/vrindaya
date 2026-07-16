using Vrindaya.Api.Models;

namespace Vrindaya.Api.Interfaces;

/// <summary>
/// Cloudinary access — the single place every image upload/replace/delete
/// in the app goes through (replaces IFirebaseStorageService). Owns the one
/// shared Cloudinary client, folder convention, and fetch_format=auto/
/// quality=auto delivery settings, so ProductStorageService/
/// HomepageStorageService (and any future per-feature storage consumer)
/// don't each re-implement the same Cloudinary plumbing. Those services
/// still own their own path-prefix convention and compression step — this
/// service knows nothing about products, sections, or image processing,
/// only bytes in, ImageUploadResult out.
///
/// Every upload is a signed, server-side request using the API Secret —
/// never an unsigned/client-side upload — so ApiSecret never leaves this
/// process.
/// </summary>
public interface ICloudinaryService
{
    /// <summary>
    /// Uploads one image under {folder}/ and returns its Cloudinary
    /// metadata. <paramref name="fileName"/> (when given) becomes the
    /// human-readable base of the generated public id — Cloudinary still
    /// appends random characters to guarantee uniqueness (Overwrite is
    /// always false; nothing this app uploads is ever silently replaced in
    /// place — see ReplaceImageAsync for the explicit delete-then-upload
    /// flow that models "replace"). Falls back to a generated id when
    /// fileName is null/empty.
    /// </summary>
    Task<ImageUploadResult> UploadImageAsync(
        string folder, byte[] bytes, string contentType, string extension, string? fileName, CancellationToken cancellationToken);

    /// <summary>Uploads every file concurrently under the same folder — one Cloudinary round trip per file, run in parallel rather than sequentially, since each upload is independent and failure of one shouldn't be silently masked by (or block) the others succeeding.</summary>
    Task<List<ImageUploadResult>> UploadMultipleImagesAsync(
        string folder, IReadOnlyList<(byte[] Bytes, string ContentType, string Extension, string? FileName)> files, CancellationToken cancellationToken);

    /// <summary>Deletes one asset by its Cloudinary public id. Idempotent — a not-found asset is treated as already-deleted, not an error.</summary>
    Task DeleteImageAsync(string publicId, CancellationToken cancellationToken);

    /// <summary>
    /// Models "replace an existing image" as delete-old-then-upload-new
    /// (Cloudinary has no in-place overwrite in this app's upload
    /// convention — see UploadImageAsync). <paramref name="existingPublicId"/>
    /// may be null/empty (nothing to delete yet, e.g. first-time upload
    /// through a "replace" UI action) — deletion is skipped in that case.
    /// </summary>
    Task<ImageUploadResult> ReplaceImageAsync(
        string folder, string? existingPublicId, byte[] bytes, string contentType, string extension, string? fileName, CancellationToken cancellationToken);

    /// <summary>
    /// Server-side remote-fetch upload — Cloudinary downloads
    /// <paramref name="sourceUrl"/> itself and stores it under a new public
    /// id, so no bytes transit this app. Cloudinary has no bucket-internal
    /// "copy" primitive analogous to GCS's CopyObjectAsync; this is the
    /// closest equivalent and is what ProductStorageService.DuplicateImagesAsync
    /// uses to duplicate a product's images without re-downloading/
    /// re-uploading bytes through the app server.
    /// </summary>
    Task<ImageUploadResult> UploadFromUrlAsync(string folder, string sourceUrl, string? fileName, CancellationToken cancellationToken);

    /// <summary>Lists every public id under {folder}/ — used to find and clean up orphaned uploads (assets that exist in Cloudinary but were never attached to, or were removed from, a product/section's tracked image list) when a product is permanently deleted. Equivalent to IFirebaseStorageService.ListObjectPathsAsync.</summary>
    Task<List<string>> ListPublicIdsAsync(string folder, CancellationToken cancellationToken);
}
