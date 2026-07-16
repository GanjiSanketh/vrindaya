using Vrindaya.Api.Common.Exceptions;
using Vrindaya.Api.DTOs.Homepage;
using Vrindaya.Api.Interfaces;
using Vrindaya.Api.Models;

namespace Vrindaya.Api.Services.Homepage;

public class PromotionalBannerService : IPromotionalBannerService
{
    private readonly IPromotionalBannerRepository _repository;
    private readonly IHomepageCacheService _cache;

    public PromotionalBannerService(IPromotionalBannerRepository repository, IHomepageCacheService cache)
    {
        _repository = repository;
        _cache = cache;
    }

    public async Task<List<PromotionalBannerResponse>> GetAllAsync(CancellationToken cancellationToken)
    {
        var banners = await _repository.GetAllAsync(cancellationToken);
        return banners.Select(b => ToResponse(b.Id, b.Data)).ToList();
    }

    public async Task<PromotionalBannerResponse> GetByIdAsync(string id, CancellationToken cancellationToken)
    {
        var doc = await _repository.GetByIdAsync(id, cancellationToken) ?? throw new NotFoundException("Promotional banner", id);
        return ToResponse(id, doc);
    }

    public async Task<PromotionalBannerResponse> CreateAsync(CreatePromotionalBannerRequest request, CancellationToken cancellationToken)
    {
        var id = _repository.GenerateId();
        var now = DateTime.UtcNow;

        var document = new PromotionalBannerDocument
        {
            DesktopImageUrl = request.DesktopImageUrl,
            DesktopImagePublicId = request.DesktopImagePublicId,
            MobileImageUrl = request.MobileImageUrl,
            MobileImagePublicId = request.MobileImagePublicId,
            ButtonText = request.ButtonText,
            ButtonUrl = request.ButtonUrl,
            DisplayOrder = request.DisplayOrder,
            Active = request.Active,
            CreatedAt = now,
            UpdatedAt = now,
        };

        await _repository.CreateAsync(id, document, cancellationToken);
        _cache.Invalidate();
        return ToResponse(id, document);
    }

    public async Task<PromotionalBannerResponse> UpdateAsync(string id, UpdatePromotionalBannerRequest request, CancellationToken cancellationToken)
    {
        var existing = await _repository.GetByIdAsync(id, cancellationToken) ?? throw new NotFoundException("Promotional banner", id);

        var document = new PromotionalBannerDocument
        {
            DesktopImageUrl = request.DesktopImageUrl,
            DesktopImagePublicId = request.DesktopImagePublicId,
            MobileImageUrl = request.MobileImageUrl,
            MobileImagePublicId = request.MobileImagePublicId,
            ButtonText = request.ButtonText,
            ButtonUrl = request.ButtonUrl,
            DisplayOrder = request.DisplayOrder,
            Active = request.Active,
            CreatedAt = existing.CreatedAt,
            UpdatedAt = DateTime.UtcNow,
        };

        await _repository.UpdateAsync(id, document, cancellationToken);
        _cache.Invalidate();
        return ToResponse(id, document);
    }

    public async Task DeleteAsync(string id, CancellationToken cancellationToken)
    {
        _ = await _repository.GetByIdAsync(id, cancellationToken) ?? throw new NotFoundException("Promotional banner", id);
        await _repository.DeleteAsync(id, cancellationToken);
        _cache.Invalidate();
    }

    public async Task<List<PromotionalBannerResponse>> GetActiveAsync(CancellationToken cancellationToken)
    {
        var banners = await _repository.GetAllAsync(cancellationToken);
        return banners.Where(b => b.Data.Active).Select(b => ToResponse(b.Id, b.Data)).ToList();
    }

    private static PromotionalBannerResponse ToResponse(string id, PromotionalBannerDocument doc) => new()
    {
        Id = id,
        DesktopImageUrl = doc.DesktopImageUrl,
        DesktopImagePublicId = doc.DesktopImagePublicId,
        MobileImageUrl = doc.MobileImageUrl,
        MobileImagePublicId = doc.MobileImagePublicId,
        ButtonText = doc.ButtonText,
        ButtonUrl = doc.ButtonUrl,
        DisplayOrder = doc.DisplayOrder,
        Active = doc.Active,
        CreatedAt = doc.CreatedAt,
        UpdatedAt = doc.UpdatedAt,
    };
}
