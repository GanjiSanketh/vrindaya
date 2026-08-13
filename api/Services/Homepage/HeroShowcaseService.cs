using Google.Cloud.Firestore;
using Vrindaya.Api.Common.Exceptions;
using Vrindaya.Api.DTOs.Homepage;
using Vrindaya.Api.Helpers;
using Vrindaya.Api.Interfaces;
using Vrindaya.Api.Models;

namespace Vrindaya.Api.Services.Homepage;

/// <summary>
/// Hero showcase management. The configuration lives as the nested
/// heroShowcase object on a fixed Firestore path (homepageConfig/active) so
/// the homepage has a single CMS record that later sections can join.
/// Images are stored via the shared ICloudinaryService under
/// hero-showcase/items; uploads only touch storage and return metadata —
/// the admin UI decides when a saved configuration becomes live.
/// </summary>
public class HeroShowcaseService : IHeroShowcaseService
{
    private const string CollectionName = "homepageConfig";
    private const string ActiveDocumentId = "active";
    private const string ItemImagesFolder = "hero-showcase/items";
    private const string CachePrefix = "homepageConfig";
    private const string ActiveConfigCacheKey = CachePrefix + ":active";
    private const long MaxUploadBytes = 10L * 1024 * 1024;
    private const int MaxItems = 10;
    private const int MinRotationIntervalSeconds = 3;
    private const int MaxRotationIntervalSeconds = 60;

    private static readonly string[] SupportedTransitions = ["fade", "slide", "scaleFade"];
    private static readonly string[] SupportedPositions = ["top", "center", "bottom", "left", "right"];
    private static readonly CacheEntryOptions CacheOptions = new() { AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(60) };

    private readonly IFirebaseService _firebase;
    private readonly ICloudinaryService _cloudinary;
    private readonly ICacheService _cache;
    private readonly ILogger<HeroShowcaseService> _logger;

    public HeroShowcaseService(
        IFirebaseService firebase,
        ICloudinaryService cloudinary,
        ICacheService cache,
        ILogger<HeroShowcaseService> logger)
    {
        _firebase = firebase;
        _cloudinary = cloudinary;
        _cache = cache;
        _logger = logger;
    }

    public async Task<HeroShowcaseDto?> GetAsync(CancellationToken cancellationToken)
    {
        var document = await GetActiveDocumentAsync(cancellationToken);
        var showcase = document?.HeroShowcase;
        return showcase is null ? null : ToDto(showcase);
    }

    public async Task<HeroShowcaseDto> SaveAsync(SaveHeroShowcaseRequest request, string updatedBy, CancellationToken cancellationToken)
    {
        Validate(request);

        var existing = await GetActiveDocumentAsync(cancellationToken);
        var now = DateTime.UtcNow;
        var itemById = (existing?.HeroShowcase?.Items ?? new List<HeroShowcaseItemDocument>())
            .ToDictionary(i => i.ItemId, StringComparer.OrdinalIgnoreCase);

        var items = new List<HeroShowcaseItemDocument>(request.Items.Count);
        var displayOrder = 1;
        foreach (var item in request.Items)
        {
            itemById.TryGetValue(item.ItemId, out var previous);
            items.Add(new HeroShowcaseItemDocument
            {
                ItemId = item.ItemId,
                ImageUrl = item.ImageUrl,
                StoragePath = item.StoragePath,
                MobileImageUrl = item.MobileImageUrl,
                MobileStoragePath = item.MobileStoragePath,
                ImagePosition = item.ImagePosition,
                Title = item.Title,
                Subtitle = item.Subtitle,
                ButtonText = item.ButtonText,
                ButtonLink = item.ButtonLink,
                DisplayOrder = displayOrder++,
                Enabled = item.Enabled,
                CreatedAt = previous?.CreatedAt ?? now,
                UpdatedAt = now,
            });
        }

        var showcase = new HeroShowcaseDocument
        {
            Enabled = request.Enabled,
            Autoplay = request.Autoplay,
            PauseOnHover = request.PauseOnHover,
            RotationIntervalSeconds = request.RotationIntervalSeconds,
            Transition = request.Transition,
            Items = items,
            CreatedAt = existing?.HeroShowcase?.CreatedAt ?? now,
            UpdatedAt = now,
            UpdatedBy = string.IsNullOrWhiteSpace(updatedBy) ? "system" : updatedBy,
        };

        var document = new HomepageConfigDocument
        {
            HeroShowcase = showcase,
            CreatedAt = existing?.CreatedAt ?? now,
            UpdatedAt = now,
            UpdatedBy = showcase.UpdatedBy,
        };

        await ActiveDocument().SetAsync(
            document,
            SetOptions.MergeFields("heroShowcase"),
            cancellationToken);

        _cache.Remove(ActiveConfigCacheKey);

        // Write first, clean up after: replacing a slide must never leave the
        // live site pointing at a deleted image. Deletion is best-effort — a
        // failure only leaves an orphaned asset in storage.
        await DeleteRemovedImagesAsync(existing?.HeroShowcase, showcase, cancellationToken);

        return ToDto(showcase);
    }

    public async Task<HeroShowcaseImageUploadResponse> UploadImageAsync(IFormFile file, CancellationToken cancellationToken)
    {
        ImageUploadValidation.Validate(file, MaxUploadBytes);
        var bytes = await ImageUploadValidation.ReadAllBytesAsync(file, cancellationToken);

        // Raw bytes are uploaded directly: showcase slides must keep their
        // full dimensions/quality, and this module's own 10MB ceiling governs
        // size (same policy as hero banners).
        var result = await _cloudinary.UploadImageAsync(
            ItemImagesFolder,
            bytes,
            file.ContentType,
            Path.GetExtension(file.FileName)?.TrimStart('.') ?? "jpg",
            file.FileName,
            cancellationToken);

        return new HeroShowcaseImageUploadResponse
        {
            Url = result.SecureUrl,
            StoragePath = result.PublicId,
            Width = result.Width,
            Height = result.Height,
            SizeBytes = result.Bytes,
        };
    }

    public async Task DeleteImageAsync(string storagePath, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(storagePath) ||
            !storagePath.StartsWith("hero-showcase/", StringComparison.OrdinalIgnoreCase))
        {
            throw new RequestValidationException("Can only delete hero showcase images.");
        }

        await _cloudinary.DeleteImageAsync(storagePath, cancellationToken);
    }

    private static void Validate(SaveHeroShowcaseRequest request)
    {
        if (request.Items.Count > MaxItems)
        {
            throw new RequestValidationException($"A hero showcase can have at most {MaxItems} items.");
        }

        if (request.Items.Count == 0)
        {
            throw new RequestValidationException("A hero showcase needs at least one item.");
        }

        if (request.RotationIntervalSeconds < MinRotationIntervalSeconds ||
            request.RotationIntervalSeconds > MaxRotationIntervalSeconds)
        {
            throw new RequestValidationException($"Rotation interval must be between {MinRotationIntervalSeconds} and {MaxRotationIntervalSeconds} seconds.");
        }

        if (!SupportedTransitions.Contains(request.Transition, StringComparer.OrdinalIgnoreCase))
        {
            throw new RequestValidationException("Unsupported transition. Only fade, slide, or scaleFade are available.");
        }

        var invalidPosition = request.Items.FirstOrDefault(i =>
            !SupportedPositions.Contains(i.ImagePosition, StringComparer.OrdinalIgnoreCase));
        if (invalidPosition is not null)
        {
            throw new RequestValidationException(
                $"Unsupported image position \"{invalidPosition.ImagePosition}\". Only top, center, bottom, left, or right are available.");
        }

        var ids = request.Items.Select(i => i.ItemId).Where(id => !string.IsNullOrWhiteSpace(id)).ToHashSet(StringComparer.OrdinalIgnoreCase);
        if (ids.Count != request.Items.Count)
        {
            throw new RequestValidationException("Every showcase item needs a unique itemId.");
        }

        var distinctLinks = request.Items
            .Where(i => !string.IsNullOrWhiteSpace(i.ButtonLink))
            .Select(i => i.ButtonLink)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);
        if (distinctLinks.Count != request.Items.Where(i => !string.IsNullOrWhiteSpace(i.ButtonLink)).Count())
        {
            throw new RequestValidationException("Duplicate button links are not allowed — each slide must link somewhere distinct.");
        }
    }

    private async Task DeleteRemovedImagesAsync(
        HeroShowcaseDocument? existing,
        HeroShowcaseDocument saved,
        CancellationToken cancellationToken)
    {
        if (existing is null)
        {
            return;
        }

        var kept = saved.Items.SelectMany(i => new[] { i.StoragePath, i.MobileStoragePath })
            .Where(p => !string.IsNullOrWhiteSpace(p))
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        foreach (var old in existing.Items)
        {
            var removedPaths = new[] { old.StoragePath, old.MobileStoragePath }
                .Where(p => !string.IsNullOrWhiteSpace(p) && !kept.Contains(p))
                .Distinct(StringComparer.OrdinalIgnoreCase);

            foreach (var storagePath in removedPaths)
            {
                try
                {
                    await _cloudinary.DeleteImageAsync(storagePath, cancellationToken);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to delete replaced hero showcase image {StoragePath}", storagePath);
                }
            }
        }

            try
            {
                await _cloudinary.DeleteImageAsync(old.StoragePath, cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to delete replaced hero showcase image {StoragePath}", old.StoragePath);
            }
        }
    }

    private DocumentReference ActiveDocument()
        => _firebase.GetFirestoreDb().Collection(CollectionName).Document(ActiveDocumentId);

    private async Task<HomepageConfigDocument?> GetActiveDocumentAsync(CancellationToken cancellationToken)
    {
        return await _cache.GetOrCreateAsync<HomepageConfigDocument>(
            ActiveConfigCacheKey,
            async token =>
            {
                var snapshot = await ActiveDocument().GetSnapshotAsync(token);
                return snapshot.Exists ? snapshot.ConvertTo<HomepageConfigDocument>() : null;
            },
            CacheOptions,
            cancellationToken);
    }

    private static HeroShowcaseDto ToDto(HeroShowcaseDocument document) => new()
    {
        Enabled = document.Enabled,
        Autoplay = document.Autoplay,
        PauseOnHover = document.PauseOnHover,
        RotationIntervalSeconds = document.RotationIntervalSeconds,
        Transition = document.Transition,
        Items = document.Items.Select(i => new HeroShowcaseItemDto
        {
            ItemId = i.ItemId,
            ImageUrl = i.ImageUrl,
            StoragePath = i.StoragePath,
            MobileImageUrl = i.MobileImageUrl,
            MobileStoragePath = i.MobileStoragePath,
            ImagePosition = i.ImagePosition,
            Title = i.Title,
            Subtitle = i.Subtitle,
            ButtonText = i.ButtonText,
            ButtonLink = i.ButtonLink,
            DisplayOrder = i.DisplayOrder,
            Enabled = i.Enabled,
            CreatedAt = i.CreatedAt,
            UpdatedAt = i.UpdatedAt,
        }).ToList(),
        CreatedAt = document.CreatedAt,
        UpdatedAt = document.UpdatedAt,
        UpdatedBy = document.UpdatedBy,
    };
}
