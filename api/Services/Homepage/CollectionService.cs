using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Caching.Memory;
using Vrindaya.Api.Common.Exceptions;
using Vrindaya.Api.Constants;
using Vrindaya.Api.DTOs.Homepage;
using Vrindaya.Api.DTOs.Products;
using Vrindaya.Api.Interfaces;
using Vrindaya.Api.Models;
using Vrindaya.Api.Services.Audit;
using System.Security.Claims;

namespace Vrindaya.Api.Services.Homepage;

/// <summary>
/// GetActiveAsync and the public (non-admin) path of GetLandingBySlugAsync
/// are cached (IMemoryCache, 60s TTL) — same pattern as BrandConfigService.
/// Admin requests to GetLandingBySlugAsync always bypass the cache: they
/// can see an inactive/draft collection that a public request would 404
/// on, and caching that response under the same key would leak draft
/// content to the next public request for the same slug.
/// </summary>
public class CollectionService : ICollectionService
{
    private static readonly TimeSpan CacheTtl = TimeSpan.FromSeconds(60);

    private readonly ICollectionRepository _repository;
    private readonly IProductService _productService;
    private readonly IHomepageCacheService _cache;
    private readonly IMemoryCache _memoryCache;
    private readonly IAuditLogService _auditLogService;
    private readonly IHttpContextAccessor _httpContextAccessor;

    public CollectionService(ICollectionRepository repository, IProductService productService, IHomepageCacheService cache, IMemoryCache memoryCache, IAuditLogService auditLogService, IHttpContextAccessor httpContextAccessor)
    {
        _repository = repository;
        _productService = productService;
        _cache = cache;
        _memoryCache = memoryCache;
        _auditLogService = auditLogService;
        _httpContextAccessor = httpContextAccessor;
    }

    private string? GetCurrentUserEmail() =>
        _httpContextAccessor.HttpContext?.User?.FindFirstValue(ClaimTypes.Email)
        ?? _httpContextAccessor.HttpContext?.User?.FindFirstValue("email");

    public async Task<List<CollectionResponse>> GetActiveAsync(CancellationToken cancellationToken)
    {
        if (_memoryCache.TryGetValue(AppConstants.CollectionsActiveCacheKey, out List<CollectionResponse>? cached) && cached != null)
        {
            return cached;
        }

        var collections = await _repository.GetActiveAsync(cancellationToken);
        var response = collections.Select(c => ToResponse(c.Id, c.Data)).ToList();

        _memoryCache.Set(AppConstants.CollectionsActiveCacheKey, response, CacheTtl);
        return response;
    }

    public async Task<List<CollectionResponse>> GetAllAsync(CancellationToken cancellationToken)
    {
        var collections = await _repository.GetAllAsync(cancellationToken);
        return collections.Select(c => ToResponse(c.Id, c.Data)).ToList();
    }

    public async Task<CollectionLandingResponse> GetLandingBySlugAsync(string slug, bool isAdmin, CancellationToken cancellationToken)
    {
        var cacheKey = AppConstants.CollectionLandingCacheKeyPrefix + slug;

        // Admins always bypass the cache — they can see an inactive/draft
        // collection that a public request would 404 on, and this method
        // shares one cache key per slug regardless of caller.
        if (!isAdmin && _memoryCache.TryGetValue(cacheKey, out CollectionLandingResponse? cached) && cached != null)
        {
            return cached;
        }

        var doc = await _repository.GetByIdAsync(slug, cancellationToken);

        // 404 (not 403) when inactive + non-admin — doesn't leak draft existence, same pattern as ProductService.GetProductByIdAsync.
        if (doc == null || (!doc.Active && !isAdmin))
        {
            throw new NotFoundException("Collection", slug);
        }

        var products = await _productService.GetSummariesByIdsAsync(doc.ProductIds, cancellationToken);

        var response = new CollectionLandingResponse
        {
            Id = slug,
            Slug = slug,
            Name = doc.Name,
            Description = doc.Description,
            Image = doc.Image,
            BannerImage = doc.BannerImage,
            SeoTitle = doc.SeoTitle,
            SeoDescription = doc.SeoDescription,
            SeoKeywords = doc.SeoKeywords,
            Products = products,
        };

        if (!isAdmin)
        {
            _memoryCache.Set(cacheKey, response, CacheTtl);
        }

        return response;
    }

    public async Task<CollectionResponse> CreateAsync(CreateCollectionRequest request, CancellationToken cancellationToken)
    {
        if (await _repository.GetByIdAsync(request.Id, cancellationToken) != null)
        {
            throw new ConflictException($"A collection with id '{request.Id}' already exists.");
        }

        var now = DateTime.UtcNow;
        var document = new CollectionDocument
        {
            Name = request.Name,
            Description = request.Description,
            Image = request.Image,
            ImagePublicId = request.ImagePublicId,
            BannerImage = request.BannerImage,
            BannerImagePublicId = request.BannerImagePublicId,
            DisplayOrder = request.DisplayOrder,
            Featured = request.Featured,
            Active = request.Active,
            ProductIds = request.ProductIds,
            SeoTitle = request.SeoTitle,
            SeoDescription = request.SeoDescription,
            SeoKeywords = request.SeoKeywords,
            CreatedAt = now,
            UpdatedAt = now,
        };

        await _repository.CreateAsync(request.Id, document, cancellationToken);
        _cache.Invalidate();
        _memoryCache.Remove(AppConstants.CollectionsActiveCacheKey);
        try { await _auditLogService.LogCreateAsync("Collections", request.Id, document.Name, AuditLogService.SerializeJson(document), GetCurrentUserEmail(), null, null, $"Collection '{document.Name}' created"); } catch { }
        return ToResponse(request.Id, document);
    }

    public async Task<CollectionResponse> UpdateAsync(string id, UpdateCollectionRequest request, CancellationToken cancellationToken)
    {
        var existing = await _repository.GetByIdAsync(id, cancellationToken) ?? throw new NotFoundException("Collection", id);

        var beforeData = AuditLogService.SerializeJson(existing);

        var document = new CollectionDocument
        {
            Name = request.Name,
            Description = request.Description,
            Image = request.Image,
            ImagePublicId = request.ImagePublicId,
            BannerImage = request.BannerImage,
            BannerImagePublicId = request.BannerImagePublicId,
            DisplayOrder = request.DisplayOrder,
            Featured = request.Featured,
            Active = request.Active,
            ProductIds = request.ProductIds,
            SeoTitle = request.SeoTitle,
            SeoDescription = request.SeoDescription,
            SeoKeywords = request.SeoKeywords,
            CreatedAt = existing.CreatedAt,
            UpdatedAt = DateTime.UtcNow,
        };

        await _repository.UpdateAsync(id, document, cancellationToken);
        _cache.Invalidate();
        _memoryCache.Remove(AppConstants.CollectionsActiveCacheKey);
        _memoryCache.Remove(AppConstants.CollectionLandingCacheKeyPrefix + id);
        try { await _auditLogService.LogUpdateAsync("Collections", id, document.Name, beforeData, AuditLogService.SerializeJson(document), GetCurrentUserEmail(), null, null, $"Collection '{document.Name}' updated"); } catch { }
        return ToResponse(id, document);
    }

    /// <summary>Mutates only Active/UpdatedAt — every other field (including a possibly-legacy Image/BannerImage value) round-trips unchanged, never passing through UpdateCollectionRequest's [Url] validation.</summary>
    public async Task<CollectionResponse> UpdateStatusAsync(string id, bool active, CancellationToken cancellationToken)
    {
        var existing = await _repository.GetByIdAsync(id, cancellationToken) ?? throw new NotFoundException("Collection", id);

        var beforeData = AuditLogService.SerializeJson(existing);

        existing.Active = active;
        existing.UpdatedAt = DateTime.UtcNow;

        await _repository.UpdateAsync(id, existing, cancellationToken);
        _cache.Invalidate();
        _memoryCache.Remove(AppConstants.CollectionsActiveCacheKey);
        _memoryCache.Remove(AppConstants.CollectionLandingCacheKeyPrefix + id);
        var action = active ? "activated" : "deactivated";
        try { await _auditLogService.LogUpdateAsync("Collections", id, existing.Name, beforeData, AuditLogService.SerializeJson(existing), GetCurrentUserEmail(), null, null, $"Collection '{existing.Name}' {action}"); } catch { }
        return ToResponse(id, existing);
    }

    public async Task DeleteAsync(string id, CancellationToken cancellationToken)
    {
        var existing = await _repository.GetByIdAsync(id, cancellationToken) ?? throw new NotFoundException("Collection", id);
        var beforeData = AuditLogService.SerializeJson(existing);
        await _repository.DeleteAsync(id, cancellationToken);
        _cache.Invalidate();
        _memoryCache.Remove(AppConstants.CollectionsActiveCacheKey);
        _memoryCache.Remove(AppConstants.CollectionLandingCacheKeyPrefix + id);
        try { await _auditLogService.LogDeleteAsync("Collections", id, existing.Name, beforeData, GetCurrentUserEmail(), null, null, $"Collection '{existing.Name}' deleted"); } catch { }
    }

    public async Task ReorderAsync(List<string> orderedIds, CancellationToken cancellationToken)
    {
        await _repository.ReorderAsync(orderedIds, cancellationToken);
        _cache.Invalidate();
        _memoryCache.Remove(AppConstants.CollectionsActiveCacheKey);
        try { await _auditLogService.LogCustomAsync("Reorder", "Collections", null, null, $"Collections reordered ({orderedIds.Count} items)", GetCurrentUserEmail(), null, null); } catch { }
    }

    public async Task<List<ProductSummaryResponse>> GetProductsBySlugAsync(string slug, CancellationToken cancellationToken)
    {
        var doc = await _repository.GetByIdAsync(slug, cancellationToken);
        if (doc == null || !doc.Active)
        {
            return [];
        }

        return await _productService.GetSummariesByIdsAsync(doc.ProductIds, cancellationToken);
    }

    private static CollectionResponse ToResponse(string id, CollectionDocument doc) => new()
    {
        Id = id,
        Slug = id,
        Name = doc.Name,
        Description = doc.Description,
        Image = doc.Image,
        ImagePublicId = doc.ImagePublicId,
        BannerImage = doc.BannerImage,
        BannerImagePublicId = doc.BannerImagePublicId,
        DisplayOrder = doc.DisplayOrder,
        Featured = doc.Featured,
        Active = doc.Active,
        ProductIds = doc.ProductIds,
        SeoTitle = doc.SeoTitle,
        SeoDescription = doc.SeoDescription,
        SeoKeywords = doc.SeoKeywords,
        CreatedAt = doc.CreatedAt,
        UpdatedAt = doc.UpdatedAt,
    };
}
