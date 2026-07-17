using Vrindaya.Api.Common;
using Vrindaya.Api.Models;

namespace Vrindaya.Api.Interfaces;

public interface IProductListingRepository
{
    Task<ProductListingDocument?> GetByIdAsync(string id, CancellationToken cancellationToken);
    Task<PagedResult<ProductListingDocument>> GetAllAsync(string? cursor, int pageSize, CancellationToken cancellationToken);
    Task<List<(string Id, ProductListingDocument Data)>> GetAllUnpagedAsync(CancellationToken cancellationToken);
    Task<List<ProductListingDocument>> GetAllByProductIdAsync(string productId, CancellationToken cancellationToken);
    Task UpsertAsync(string id, ProductListingDocument document, CancellationToken cancellationToken);
    Task BulkUpdateStatusAsync(List<string> ids, string status, string updatedBy, CancellationToken cancellationToken);
}
