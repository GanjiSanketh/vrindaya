using Vrindaya.Api.Common;
using Vrindaya.Api.DTOs.InventoryManagement;
using Vrindaya.Api.DTOs.Suppliers;

namespace Vrindaya.Api.Interfaces;

public interface ISupplierService
{
    Task<SupplierResponse> GetAsync(string id, CancellationToken cancellationToken);

    Task<PagedResult<SupplierResponse>> GetAllAsync(
        string? cursor, int pageSize, string? search, bool? activeOnly, string sortBy, bool sortDescending, CancellationToken cancellationToken);

    Task<SupplierResponse> CreateAsync(CreateSupplierRequest request, CancellationToken cancellationToken);

    Task<SupplierResponse> UpdateAsync(string id, UpdateSupplierRequest request, CancellationToken cancellationToken);

    Task<SupplierResponse> ActivateAsync(string id, CancellationToken cancellationToken);

    Task<SupplierResponse> DeactivateAsync(string id, CancellationToken cancellationToken);

    Task<SupplierStatsResponse> GetStatsAsync(string id, CancellationToken cancellationToken);

    Task<PagedResult<PurchaseEntryResponse>> GetPurchaseHistoryAsync(string id, string? cursor, int pageSize, CancellationToken cancellationToken);
}
