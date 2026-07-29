using Microsoft.Extensions.Caching.Memory;
using Vrindaya.Api.Common.Exceptions;
using Vrindaya.Api.Constants;
using Vrindaya.Api.DTOs.Homepage;
using Vrindaya.Api.Interfaces;
using Vrindaya.Api.Models;

namespace Vrindaya.Api.Services.Homepage;

public class CategoryService : ICategoryService
{
    private static readonly TimeSpan CacheTtl = TimeSpan.FromSeconds(60);

    private readonly ICategoryRepository _repository;
    private readonly IMemoryCache _memoryCache;
    private readonly ICloudinaryService _cloudinary;

    public CategoryService(ICategoryRepository repository, IMemoryCache memoryCache, ICloudinaryService cloudinary)
    {
        _repository = repository;
        _memoryCache = memoryCache;
        _cloudinary = cloudinary;
    }

    public async Task<List<CategoryResponse>> GetActiveAsync(CancellationToken cancellationToken)
    {
        if (_memoryCache.TryGetValue(AppConstants.CategoriesActiveCacheKey, out List<CategoryResponse>? cached) && cached != null)
        {
            return cached;
        }

        var categories = await _repository.GetActiveAsync(cancellationToken);
        var response = categories.Select(c => ToResponse(c.Id, c.Data)).ToList();

        _memoryCache.Set(AppConstants.CategoriesActiveCacheKey, response, CacheTtl);
        return response;
    }

    public async Task<List<CategoryResponse>> GetAllAsync(CancellationToken cancellationToken)
    {
        var categories = await _repository.GetAllAsync(cancellationToken);
        return categories.Select(c => ToResponse(c.Id, c.Data)).ToList();
    }

    public async Task<CategoryResponse> CreateAsync(CreateCategoryRequest request, CancellationToken cancellationToken)
    {
        if (await _repository.GetByIdAsync(request.Id, cancellationToken) != null)
        {
            throw new ConflictException($"A category with id '{request.Id}' already exists.");
        }

        var now = DateTime.UtcNow;
        var document = new CategoryDocument
        {
            Name = request.Name,
            Code = request.Code,
            Subtitle = request.Subtitle,
            Description = request.Description,
            Image = request.Image,
            ImagePublicId = request.ImagePublicId,
            BannerImage = request.BannerImage,
            BannerImagePublicId = request.BannerImagePublicId,
            DisplayOrder = request.DisplayOrder,
            Featured = request.Featured,
            Active = request.Active,
            SeoTitle = request.SeoTitle,
            SeoDescription = request.SeoDescription,
            SeoKeywords = request.SeoKeywords,
            CreatedAt = now,
            UpdatedAt = now,
        };

        await _repository.CreateAsync(request.Id, document, cancellationToken);
        _memoryCache.Remove(AppConstants.CategoriesActiveCacheKey);
        return ToResponse(request.Id, document);
    }

    public async Task<CategoryResponse> UpdateAsync(string id, UpdateCategoryRequest request, CancellationToken cancellationToken)
    {
        var existing = await _repository.GetByIdAsync(id, cancellationToken) ?? throw new NotFoundException("Category", id);

        var document = new CategoryDocument
        {
            Name = request.Name,
            Code = request.Code,
            Subtitle = request.Subtitle,
            Description = request.Description,
            Image = request.Image,
            ImagePublicId = request.ImagePublicId,
            BannerImage = request.BannerImage,
            BannerImagePublicId = request.BannerImagePublicId,
            DisplayOrder = request.DisplayOrder,
            Featured = request.Featured,
            Active = request.Active,
            SeoTitle = request.SeoTitle,
            SeoDescription = request.SeoDescription,
            SeoKeywords = request.SeoKeywords,
            CreatedAt = existing.CreatedAt,
            UpdatedAt = DateTime.UtcNow,
        };

        await _repository.UpdateAsync(id, document, cancellationToken);
        _memoryCache.Remove(AppConstants.CategoriesActiveCacheKey);
        return ToResponse(id, document);
    }

    public async Task<CategoryResponse> UpdateStatusAsync(string id, bool active, CancellationToken cancellationToken)
    {
        var existing = await _repository.GetByIdAsync(id, cancellationToken) ?? throw new NotFoundException("Category", id);

        existing.Active = active;
        existing.UpdatedAt = DateTime.UtcNow;

        await _repository.UpdateAsync(id, existing, cancellationToken);
        _memoryCache.Remove(AppConstants.CategoriesActiveCacheKey);
        return ToResponse(id, existing);
    }

    public async Task DeleteAsync(string id, CancellationToken cancellationToken)
    {
        await _repository.DeleteAsync(id, cancellationToken);
        _memoryCache.Remove(AppConstants.CategoriesActiveCacheKey);
    }

    public async Task ReorderAsync(List<string> orderedIds, CancellationToken cancellationToken)
    {
        await _repository.ReorderAsync(orderedIds, cancellationToken);
        _memoryCache.Remove(AppConstants.CategoriesActiveCacheKey);
    }

    public async Task<CategoryResponse> UploadImageAsync(string id, Microsoft.AspNetCore.Http.IFormFile file, CancellationToken cancellationToken)
    {
        var existing = await _repository.GetByIdAsync(id, cancellationToken) ?? throw new NotFoundException("Category", id);

        using var ms = new MemoryStream();
        await file.CopyToAsync(ms, cancellationToken);
        var bytes = ms.ToArray();
        var extension = Path.GetExtension(file.FileName)?.TrimStart('.') ?? "jpg";
        
        var uploadResult = await _cloudinary.ReplaceImageAsync(
            "categories",
            existing.ImagePublicId,
            bytes,
            file.ContentType,
            extension,
            file.FileName,
            cancellationToken);

        existing.Image = uploadResult.SecureUrl;
        existing.ImagePublicId = uploadResult.PublicId;
        existing.UpdatedAt = DateTime.UtcNow;

        await _repository.UpdateAsync(id, existing, cancellationToken);
        _memoryCache.Remove(AppConstants.CategoriesActiveCacheKey);
        
        return ToResponse(id, existing);
    }

    private static CategoryResponse ToResponse(string id, CategoryDocument doc) => new()
    {
        Id = id,
        Slug = id,
        Name = doc.Name,
        Code = doc.Code,
        Subtitle = doc.Subtitle,
        Description = doc.Description,
        Image = doc.Image,
        ImagePublicId = doc.ImagePublicId,
        BannerImage = doc.BannerImage,
        BannerImagePublicId = doc.BannerImagePublicId,
        DisplayOrder = doc.DisplayOrder,
        Featured = doc.Featured,
        Active = doc.Active,
        SeoTitle = doc.SeoTitle,
        SeoDescription = doc.SeoDescription,
        SeoKeywords = doc.SeoKeywords,
        CreatedAt = doc.CreatedAt,
        UpdatedAt = doc.UpdatedAt,
    };
}
