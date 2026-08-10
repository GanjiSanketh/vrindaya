using Google.Cloud.Firestore;
using Vrindaya.Api.Common.Exceptions;
using Vrindaya.Api.Constants;
using Vrindaya.Api.DTOs.HeroBanners;
using Vrindaya.Api.Interfaces;
using Vrindaya.Api.Models;

namespace Vrindaya.Api.Services.HeroBanners;

/// <summary>
/// Hero banner management. The active banner lives at a fixed Firestore
/// path (heroBanners/active) so there can only ever be one active banner —
/// every save is an overwrite. Images are stored via the shared
/// ICloudinaryService under hero-banners/desktop and hero-banners/mobile;
/// uploads only touch storage and return metadata, the admin UI decides
/// when a saved banner becomes published.
/// </summary>
public class HeroBannerService : IHeroBannerService
{
    private const string CollectionName = "heroBanners";
    private const string ActiveDocumentId = "active";
    private const string CachePrefix = "heroBanners";
    private const string ActiveCacheKey = CachePrefix + ":active";
    private static readonly CacheEntryOptions CacheOptions = new() { AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(60) };
    private const string DesktopFolder = "hero-banners/desktop";
    private const string MobileFolder = "hero-banners/mobile";
    private const long MaxUploadBytes = 10L * 1024 * 1024;

    private readonly IFirebaseService _firebase;
    private readonly ICloudinaryService _cloudinary;
    private readonly ICacheService _cacheService;
    private readonly ILogger<HeroBannerService> _logger;

    public HeroBannerService(
        IFirebaseService firebase,
        ICloudinaryService cloudinary,
        ICacheService cacheService,
        ILogger<HeroBannerService> logger)
    {
        _firebase = firebase;
        _cloudinary = cloudinary;
        _cacheService = cacheService;
        _logger = logger;
    }

    public async Task<HeroBannerDto?> GetActiveAsync(CancellationToken cancellationToken)
    {
        var document = await GetActiveDocumentAsync(cancellationToken);
        return document is null ? null : ToDto(document);
    }

    public async Task<HeroBannerDto> SaveAsync(SaveHeroBannerRequest request, string updatedBy, CancellationToken cancellationToken)
    {
        if (request.IsPublished && string.IsNullOrWhiteSpace(request.DesktopImageUrl))
        {
            throw new RequestValidationException("A desktop banner image is required before publishing.");
        }

        var existing = await GetActiveDocumentAsync(cancellationToken);
        var now = DateTime.UtcNow;

        var document = new HeroBannerDocument
        {
            DesktopImageUrl = request.DesktopImageUrl,
            MobileImageUrl = request.MobileImageUrl,
            DesktopStoragePath = request.DesktopStoragePath,
            MobileStoragePath = request.MobileStoragePath,
            IsPublished = request.IsPublished,
            CreatedAt = existing?.CreatedAt ?? now,
            UpdatedAt = now,
            UpdatedBy = string.IsNullOrWhiteSpace(updatedBy) ? "system" : updatedBy,
        };

        await ActiveDocument().SetAsync(document, cancellationToken: cancellationToken);
        _cacheService.Remove(ActiveCacheKey);

        // Write first, clean up after: replacing the banner must never leave
        // the live site pointing at a deleted image. Deletion is best-effort —
        // a failure only leaves an orphaned asset in storage, never a broken banner.
        await DeleteReplacedImagesAsync(existing, request, cancellationToken);

        return ToDto(document);
    }

    public Task<HeroBannerImageUploadResponse> UploadDesktopImageAsync(IFormFile file, CancellationToken cancellationToken)
        => UploadImageAsync(file, DesktopFolder, cancellationToken);

    public Task<HeroBannerImageUploadResponse> UploadMobileImageAsync(IFormFile file, CancellationToken cancellationToken)
        => UploadImageAsync(file, MobileFolder, cancellationToken);

    public async Task DeleteImageAsync(string storagePath, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(storagePath) ||
            !storagePath.StartsWith("hero-banners/", StringComparison.OrdinalIgnoreCase))
        {
            throw new RequestValidationException("Can only delete hero banner images.");
        }

        await _cloudinary.DeleteImageAsync(storagePath, cancellationToken);
    }

    private async Task<HeroBannerImageUploadResponse> UploadImageAsync(IFormFile file, string folder, CancellationToken cancellationToken)
    {
        ValidateUpload(file);

        using var stream = new MemoryStream();
        await file.CopyToAsync(stream, cancellationToken);
        var bytes = stream.ToArray();

        // Raw bytes are uploaded directly (no ImageCompressionService pass):
        // hero banners must keep their full dimensions/quality, and this
        // module's own 10MB ceiling governs size — the product image
        // compressor's 5MB cap would otherwise reject valid banner uploads.
        var result = await _cloudinary.UploadImageAsync(
            folder,
            bytes,
            file.ContentType,
            Path.GetExtension(file.FileName)?.TrimStart('.') ?? "jpg",
            file.FileName,
            cancellationToken);

        return new HeroBannerImageUploadResponse
        {
            Url = result.SecureUrl,
            StoragePath = result.PublicId,
            Width = result.Width,
            Height = result.Height,
            SizeBytes = result.Bytes,
        };
    }

    private static void ValidateUpload(IFormFile? file)
    {
        if (file is null || file.Length == 0)
        {
            throw new RequestValidationException("An image file is required.");
        }

        if (!AppConstants.AllowedImageContentTypes.Contains(file.ContentType))
        {
            throw new RequestValidationException("Only JPG, JPEG, PNG, or WebP images are accepted.");
        }

        if (file.Length > MaxUploadBytes)
        {
            throw new RequestValidationException($"Image is too large (max {MaxUploadBytes / (1024 * 1024)} MB).");
        }
    }

    private async Task DeleteReplacedImagesAsync(HeroBannerDocument? existing, SaveHeroBannerRequest request, CancellationToken cancellationToken)
    {
        if (existing is null)
        {
            return;
        }

        await SafeDeleteAsync(existing.DesktopStoragePath, request.DesktopStoragePath, cancellationToken);
        await SafeDeleteAsync(existing.MobileStoragePath, request.MobileStoragePath, cancellationToken);
    }

    private async Task SafeDeleteAsync(string oldPath, string newPath, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(oldPath) ||
            string.Equals(oldPath, newPath, StringComparison.OrdinalIgnoreCase))
        {
            return;
        }

        try
        {
            await _cloudinary.DeleteImageAsync(oldPath, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to delete replaced hero banner image {StoragePath}", oldPath);
        }
    }

    private DocumentReference ActiveDocument()
        => _firebase.GetFirestoreDb().Collection(CollectionName).Document(ActiveDocumentId);

    private async Task<HeroBannerDocument?> GetActiveDocumentAsync(CancellationToken cancellationToken)
    {
        return await _cacheService.GetOrCreateAsync(
            ActiveCacheKey,
            async token =>
            {
                var snapshot = await ActiveDocument().GetSnapshotAsync(token);
                return snapshot.Exists ? snapshot.ConvertTo<HeroBannerDocument>() : null;
            },
            CacheOptions,
            cancellationToken);
    }

    private static HeroBannerDto ToDto(HeroBannerDocument document) => new()
    {
        DesktopImageUrl = document.DesktopImageUrl,
        MobileImageUrl = document.MobileImageUrl,
        DesktopStoragePath = document.DesktopStoragePath,
        MobileStoragePath = document.MobileStoragePath,
        IsPublished = document.IsPublished,
        CreatedAt = document.CreatedAt,
        UpdatedAt = document.UpdatedAt,
        UpdatedBy = document.UpdatedBy,
    };
}
