using Vrindaya.Api.Common.Exceptions;
using Vrindaya.Api.DTOs.Homepage;
using Vrindaya.Api.Interfaces;
using Vrindaya.Api.Models;

namespace Vrindaya.Api.Services.Homepage;

public class HeroBannerService : IHeroBannerService
{
    private readonly IHeroBannerRepository _repository;
    private readonly IHomepageCacheService _cache;

    public HeroBannerService(IHeroBannerRepository repository, IHomepageCacheService cache)
    {
        _repository = repository;
        _cache = cache;
    }

    public async Task<List<HeroBannerResponse>> GetAllAsync(CancellationToken cancellationToken)
    {
        var banners = await _repository.GetAllAsync(cancellationToken);
        return banners.Select(b => ToResponse(b.Id, b.Data)).ToList();
    }

    public async Task<HeroBannerResponse> GetByIdAsync(string id, CancellationToken cancellationToken)
    {
        var doc = await _repository.GetByIdAsync(id, cancellationToken) ?? throw new NotFoundException("Hero banner", id);
        return ToResponse(id, doc);
    }

    public async Task<HeroBannerResponse> CreateAsync(CreateHeroBannerRequest request, CancellationToken cancellationToken)
    {
        var id = _repository.GenerateId();
        var now = DateTime.UtcNow;

        var document = new HeroBannerDocument
        {
            Title = request.Title,
            Subtitle = request.Subtitle,
            ButtonText = request.ButtonText,
            ButtonUrl = request.ButtonUrl,
            BackgroundImageUrl = request.BackgroundImageUrl,
            BackgroundImagePublicId = request.BackgroundImagePublicId,
            MobileImageUrl = request.MobileImageUrl,
            MobileImagePublicId = request.MobileImagePublicId,
            DisplayOrder = request.DisplayOrder,
            StartDate = request.StartDate,
            EndDate = request.EndDate,
            Active = request.Active,
            CreatedAt = now,
            UpdatedAt = now,
        };

        await _repository.CreateAsync(id, document, cancellationToken);
        _cache.Invalidate();
        return ToResponse(id, document);
    }

    public async Task<HeroBannerResponse> UpdateAsync(string id, UpdateHeroBannerRequest request, CancellationToken cancellationToken)
    {
        var existing = await _repository.GetByIdAsync(id, cancellationToken) ?? throw new NotFoundException("Hero banner", id);

        var document = new HeroBannerDocument
        {
            Title = request.Title,
            Subtitle = request.Subtitle,
            ButtonText = request.ButtonText,
            ButtonUrl = request.ButtonUrl,
            BackgroundImageUrl = request.BackgroundImageUrl,
            BackgroundImagePublicId = request.BackgroundImagePublicId,
            MobileImageUrl = request.MobileImageUrl,
            MobileImagePublicId = request.MobileImagePublicId,
            DisplayOrder = request.DisplayOrder,
            StartDate = request.StartDate,
            EndDate = request.EndDate,
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
        _ = await _repository.GetByIdAsync(id, cancellationToken) ?? throw new NotFoundException("Hero banner", id);
        await _repository.DeleteAsync(id, cancellationToken);
        _cache.Invalidate();
    }

    public async Task<HeroBannerResponse?> GetActiveBannerAsync(CancellationToken cancellationToken)
    {
        var now = DateTime.UtcNow;
        var banners = await _repository.GetActiveAsync(cancellationToken);

        var qualifying = banners
            .Where(b => b.Data.Active)
            .Where(b => b.Data.StartDate == null || b.Data.StartDate <= now)
            .Where(b => b.Data.EndDate == null || b.Data.EndDate >= now)
            .OrderBy(b => b.Data.DisplayOrder)
            .FirstOrDefault();

        return qualifying.Data == null ? null : ToResponse(qualifying.Id, qualifying.Data);
    }

    private static HeroBannerResponse ToResponse(string id, HeroBannerDocument doc) => new()
    {
        Id = id,
        Title = doc.Title,
        Subtitle = doc.Subtitle,
        ButtonText = doc.ButtonText,
        ButtonUrl = doc.ButtonUrl,
        BackgroundImageUrl = doc.BackgroundImageUrl,
        BackgroundImagePublicId = doc.BackgroundImagePublicId,
        MobileImageUrl = doc.MobileImageUrl,
        MobileImagePublicId = doc.MobileImagePublicId,
        DisplayOrder = doc.DisplayOrder,
        StartDate = doc.StartDate,
        EndDate = doc.EndDate,
        Active = doc.Active,
        CreatedAt = doc.CreatedAt,
        UpdatedAt = doc.UpdatedAt,
    };
}
