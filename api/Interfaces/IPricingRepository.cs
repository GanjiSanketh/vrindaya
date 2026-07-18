using Vrindaya.Api.Common;
using Vrindaya.Api.Models;

namespace Vrindaya.Api.Interfaces;

public interface IPricingRepository
{
    Task<PricingDocument?> GetByIdAsync(string id, CancellationToken cancellationToken);

    Task<PagedResult<(string Id, PricingDocument Data)>> GetAllAsync(
        string? cursor, int pageSize, string? search, string? marketplace,
        bool? isActive, string? inventoryVariantId, string sortBy, bool sortDescending,
        CancellationToken cancellationToken);

    Task<List<(string Id, PricingDocument Data)>> GetByVariantIdAsync(string variantId, CancellationToken cancellationToken);

    Task<string> CreateAsync(PricingDocument document, CancellationToken cancellationToken);

    Task UpdateAsync(string id, PricingDocument document, CancellationToken cancellationToken);

    Task<bool> ExistsByVariantAndMarketplaceAsync(string variantId, string marketplace, string? excludeId, CancellationToken cancellationToken);

    Task DeleteAsync(string id, CancellationToken cancellationToken);

    Task<List<(string Id, PricingDocument Data)>> GetAllUnpagedAsync(CancellationToken cancellationToken);
}
