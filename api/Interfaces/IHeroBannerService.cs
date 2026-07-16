using Vrindaya.Api.DTOs.Homepage;

namespace Vrindaya.Api.Interfaces;

public interface IHeroBannerService
{
    Task<List<HeroBannerResponse>> GetAllAsync(CancellationToken cancellationToken);

    Task<HeroBannerResponse> GetByIdAsync(string id, CancellationToken cancellationToken);

    Task<HeroBannerResponse> CreateAsync(CreateHeroBannerRequest request, CancellationToken cancellationToken);

    Task<HeroBannerResponse> UpdateAsync(string id, UpdateHeroBannerRequest request, CancellationToken cancellationToken);

    Task DeleteAsync(string id, CancellationToken cancellationToken);

    /// <summary>The one banner the public homepage renders — lowest DisplayOrder among Active, currently in-date-range banners. Null if none qualify.</summary>
    Task<HeroBannerResponse?> GetActiveBannerAsync(CancellationToken cancellationToken);
}
