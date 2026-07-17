using Vrindaya.Api.Common;
using Vrindaya.Api.DTOs.ListingManagement;

namespace Vrindaya.Api.Interfaces;

public interface IProductListingService
{
    Task<PagedResult<ProductListingResponse>> GetAllAsync(ProductListingQuery query, CancellationToken cancellationToken);
    Task<ProductListingResponse> GetByIdAsync(string id, CancellationToken cancellationToken);
    Task<ProductListingResponse> UpdateAsync(string id, UpdateProductListingRequest request, string updatedBy, CancellationToken cancellationToken);
    Task<List<ProductListingResponse>> BulkUpdateStatusAsync(BulkUpdateListingStatusRequest request, string updatedBy, CancellationToken cancellationToken);
    Task<MarketplaceDashboardResponse> GetDashboardAsync(CancellationToken cancellationToken);
}
