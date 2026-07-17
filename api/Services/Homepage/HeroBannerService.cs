using Microsoft.AspNetCore.Http;
using Vrindaya.Api.Common.Exceptions;
using Vrindaya.Api.DTOs.Homepage;
using Vrindaya.Api.Interfaces;
using Vrindaya.Api.Models;
using Vrindaya.Api.Services.Audit;
using System.Security.Claims;

namespace Vrindaya.Api.Services.Homepage;

public class HeroBannerService : IHeroBannerService
{
    private readonly IHeroBannerRepository _repository;
    private readonly IHomepageCacheService _cache;
    private readonly IAuditLogService _auditLogService;
    private readonly IHttpContextAccessor _httpContextAccessor;

    public HeroBannerService(IHeroBannerRepository repository, IHomepageCacheService cache, IAuditLogService auditLogService, IHttpContextAccessor httpContextAccessor)
    {
        _repository = repository;
        _cache = cache;
        _auditLogService = auditLogService;
        _httpContextAccessor = httpContextAccessor;
    }

    private string? GetCurrentUserEmail() =>
        _httpContextAccessor.HttpContext?.User?.FindFirstValue(ClaimTypes.Email)
        ?? _httpContextAccessor.HttpContext?.User?.FindFirstValue("email");

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
        try { await _auditLogService.LogCreateAsync("HeroBanners", id, document.Title, AuditLogService.SerializeJson(document), GetCurrentUserEmail(), null, null, $"Hero banner '{document.Title}' created"); } catch { }
        return ToResponse(id, document);
    }

    public async Task<HeroBannerResponse> UpdateAsync(string id, UpdateHeroBannerRequest request, CancellationToken cancellationToken)
    {
        var existing = await _repository.GetByIdAsync(id, cancellationToken) ?? throw new NotFoundException("Hero banner", id);

        var beforeData = AuditLogService.SerializeJson(existing);

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
        try { await _auditLogService.LogUpdateAsync("HeroBanners", id, document.Title, beforeData, AuditLogService.SerializeJson(document), GetCurrentUserEmail(), null, null, $"Hero banner '{document.Title}' updated"); } catch { }
        return ToResponse(id, document);
    }

    public async Task DeleteAsync(string id, CancellationToken cancellationToken)
    {
        var existing = await _repository.GetByIdAsync(id, cancellationToken) ?? throw new NotFoundException("Hero banner", id);
        var beforeData = AuditLogService.SerializeJson(existing);
        await _repository.DeleteAsync(id, cancellationToken);
        _cache.Invalidate();
        try { await _auditLogService.LogDeleteAsync("HeroBanners", id, existing.Title, beforeData, GetCurrentUserEmail(), null, null, $"Hero banner '{existing.Title}' deleted"); } catch { }
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
