using Vrindaya.Api.Models;

namespace Vrindaya.Api.Interfaces;

public interface IPromotionalBannerRepository
{
    string GenerateId();

    Task<List<(string Id, PromotionalBannerDocument Data)>> GetAllAsync(CancellationToken cancellationToken);

    Task<PromotionalBannerDocument?> GetByIdAsync(string id, CancellationToken cancellationToken);

    Task CreateAsync(string id, PromotionalBannerDocument document, CancellationToken cancellationToken);

    Task UpdateAsync(string id, PromotionalBannerDocument document, CancellationToken cancellationToken);

    Task DeleteAsync(string id, CancellationToken cancellationToken);
}
