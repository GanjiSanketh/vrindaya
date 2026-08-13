using Google.Cloud.Firestore;
using Vrindaya.Api.Common.Exceptions;
using Vrindaya.Api.DTOs.Homepage;
using Vrindaya.Api.Helpers;
using Vrindaya.Api.Interfaces;
using Vrindaya.Api.Models;

namespace Vrindaya.Api.Services.Homepage;

/// <summary>
/// Vrindaya Story management. The configuration lives as the nested
/// vrindayaStory object on a fixed Firestore path (homepageConfig/active)
/// so the homepage has a single CMS record that later sections can join.
/// Images are stored via the shared ICloudinaryService under
/// vrindaya-story/items; uploads only touch storage and return metadata —
/// the admin UI decides when a saved configuration becomes live.
/// </summary>
public class VrindayaStoryService : IVrindayaStoryService
{
    private const string CollectionName = "homepageConfig";
    private const string ActiveDocumentId = "active";
    private const string ItemImagesFolder = "vrindaya-story/items";
    private const string CachePrefix = "homepageConfig";
    private const string ActiveConfigCacheKey = CachePrefix + ":active";
    private const long MaxUploadBytes = 10L * 1024 * 1024;
    private const int MaxItems = 12;
    private const int MinItems = 1;

    private static readonly string[] SupportedPositions = ["top", "center", "bottom", "left", "right"];
    private static readonly CacheEntryOptions CacheOptions = new() { AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(60) };

    private readonly IFirebaseService _firebase;
    private readonly ICloudinaryService _cloudinary;
    private readonly ICacheService _cache;
    private readonly ILogger<VrindayaStoryService> _logger;

    public VrindayaStoryService(
        IFirebaseService firebase,
        ICloudinaryService cloudinary,
        ICacheService cache,
        ILogger<VrindayaStoryService> logger)
    {
        _firebase = firebase;
        _cloudinary = cloudinary;
        _cache = cache;
        _logger = logger;
    }

    public async Task<VrindayaStoryDto?> GetAsync(CancellationToken cancellationToken)
    {
        var document = await GetActiveDocumentAsync(cancellationToken);
        var story = document?.VrindayaStory;
        return story is null ? null : ToDto(story);
    }

    public async Task<VrindayaStoryDto> SaveAsync(SaveVrindayaStoryRequest request, string updatedBy, CancellationToken cancellationToken)
    {
        Validate(request);

        var existing = await GetActiveDocumentAsync(cancellationToken);
        var now = DateTime.UtcNow;
        var itemById = (existing?.VrindayaStory?.Items ?? new List<VrindayaStoryItemDocument>())
            .ToDictionary(i => i.StoryId, StringComparer.OrdinalIgnoreCase);

        var items = new List<VrindayaStoryItemDocument>(request.Items.Count);
        var displayOrder = 1;
        foreach (var item in request.Items)
        {
            itemById.TryGetValue(item.StoryId, out var previous);
            items.Add(new VrindayaStoryItemDocument
            {
                StoryId = item.StoryId,
                StoryNumber = item.StoryNumber,
                Title = item.Title,
                Description = item.Description,
                ImageUrl = item.ImageUrl,
                ImageAlt = item.ImageAlt,
                ImagePosition = item.ImagePosition,
                DisplayOrder = displayOrder++,
                IsActive = item.IsActive,
                StoragePath = item.StoragePath,
                CreatedAt = previous?.CreatedAt ?? now,
                UpdatedAt = now,
            });
        }

        var story = new VrindayaStoryDocument
        {
            Items = items,
            CreatedAt = existing?.VrindayaStory?.CreatedAt ?? now,
            UpdatedAt = now,
            UpdatedBy = string.IsNullOrWhiteSpace(updatedBy) ? "system" : updatedBy,
        };

        var document = new HomepageConfigDocument
        {
            VrindayaStory = story,
            CreatedAt = existing?.CreatedAt ?? now,
            UpdatedAt = now,
            UpdatedBy = story.UpdatedBy,
        };

        await ActiveDocument().SetAsync(
            document,
            SetOptions.MergeFields("vrindayaStory"),
            cancellationToken);

        _cache.Remove(ActiveConfigCacheKey);

        // Write first, clean up after: replacing a story image must never leave
        // the live site pointing at a deleted asset. Deletion is best-effort —
        // a failure only leaves an orphaned image in storage.
        await DeleteRemovedImagesAsync(existing?.VrindayaStory, story, cancellationToken);

        return ToDto(story);
    }

    public async Task<VrindayaStoryImageUploadResponse> UploadImageAsync(IFormFile file, CancellationToken cancellationToken)
    {
        ImageUploadValidation.Validate(file, MaxUploadBytes);
        var bytes = await ImageUploadValidation.ReadAllBytesAsync(file, cancellationToken);

        // Raw bytes are uploaded directly: story frames must keep their full
        // dimensions/quality, and this module's own 10MB ceiling governs size
        // (same policy as hero showcase / hero banners).
        var result = await _cloudinary.UploadImageAsync(
            ItemImagesFolder,
            bytes,
            file.ContentType,
            Path.GetExtension(file.FileName)?.TrimStart('.') ?? "jpg",
            file.FileName,
            cancellationToken);

        return new VrindayaStoryImageUploadResponse
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
            !storagePath.StartsWith("vrindaya-story/", StringComparison.OrdinalIgnoreCase))
        {
            throw new RequestValidationException("Can only delete Vrindaya story images.");
        }

        await _cloudinary.DeleteImageAsync(storagePath, cancellationToken);
    }

    private static void Validate(SaveVrindayaStoryRequest request)
    {
        if (request.Items.Count > MaxItems)
        {
            throw new RequestValidationException($"The Vrindaya Story can have at most {MaxItems} items.");
        }

        if (request.Items.Count < MinItems)
        {
            throw new RequestValidationException("The Vrindaya Story needs at least one item.");
        }

        var ids = request.Items.Select(i => i.StoryId)
            .Where(id => !string.IsNullOrWhiteSpace(id))
            .ToHashSet(StringComparer.OrdinalIgnoreCase);
        if (ids.Count != request.Items.Count)
        {
            throw new RequestValidationException("Every story item needs a unique storyId.");
        }

        var invalidPosition = request.Items.FirstOrDefault(i =>
            !SupportedPositions.Contains(i.ImagePosition, StringComparer.OrdinalIgnoreCase));
        if (invalidPosition is not null)
        {
            throw new RequestValidationException(
                $"Unsupported image position \"{invalidPosition.ImagePosition}\". Only top, center, bottom, left, or right are available.");
        }
    }

    private async Task DeleteRemovedImagesAsync(
        VrindayaStoryDocument? existing,
        VrindayaStoryDocument saved,
        CancellationToken cancellationToken)
    {
        if (existing is null)
        {
            return;
        }

        var kept = saved.Items.Select(i => i.StoragePath)
            .Where(p => !string.IsNullOrWhiteSpace(p))
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        foreach (var old in existing.Items)
        {
            if (string.IsNullOrWhiteSpace(old.StoragePath) || kept.Contains(old.StoragePath))
            {
                continue;
            }

            try
            {
                await _cloudinary.DeleteImageAsync(old.StoragePath, cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to delete replaced Vrindaya story image {StoragePath}", old.StoragePath);
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

    private static VrindayaStoryDto ToDto(VrindayaStoryDocument document) => new()
    {
        Items = document.Items.Select(i => new VrindayaStoryItemDto
        {
            StoryId = i.StoryId,
            StoryNumber = i.StoryNumber,
            Title = i.Title,
            Description = i.Description,
            ImageUrl = i.ImageUrl,
            ImageAlt = i.ImageAlt,
            ImagePosition = i.ImagePosition,
            DisplayOrder = i.DisplayOrder,
            IsActive = i.IsActive,
            StoragePath = i.StoragePath,
            CreatedAt = i.CreatedAt,
            UpdatedAt = i.UpdatedAt,
        }).ToList(),
        CreatedAt = document.CreatedAt,
        UpdatedAt = document.UpdatedAt,
        UpdatedBy = document.UpdatedBy,
    };
}
