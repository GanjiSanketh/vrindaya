using Vrindaya.Api.DTOs.Homepage;

namespace Vrindaya.Api.Interfaces;

public interface IPromotionalBannerService
{
    Task<List<PromotionalBannerResponse>> GetAllAsync(CancellationToken cancellationToken);

    Task<PromotionalBannerResponse> GetByIdAsync(string id, CancellationToken cancellationToken);

    Task<PromotionalBannerResponse> CreateAsync(CreatePromotionalBannerRequest request, CancellationToken cancellationToken);

    Task<PromotionalBannerResponse> UpdateAsync(string id, UpdatePromotionalBannerRequest request, CancellationToken cancellationToken);

    Task DeleteAsync(string id, CancellationToken cancellationToken);

    /// <summary>Every currently Active banner, ordered — the public homepage shows all of them (not schedule-and-pick-one, unlike Hero).</summary>
    Task<List<PromotionalBannerResponse>> GetActiveAsync(CancellationToken cancellationToken);
}
