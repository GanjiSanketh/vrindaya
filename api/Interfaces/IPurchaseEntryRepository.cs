using Vrindaya.Api.Common;
using Vrindaya.Api.Models;

namespace Vrindaya.Api.Interfaces;

/// <summary>Purchase HEADER access only — see IPurchaseItemRepository for line items.</summary>
public interface IPurchaseEntryRepository
{
    /// <summary>Auto-generated id. Returns the new document's id.</summary>
    Task<string> CreateAsync(PurchaseEntryDocument document, CancellationToken cancellationToken);

    Task<PurchaseEntryDocument?> GetByIdAsync(string id, CancellationToken cancellationToken);

    Task UpdateAsync(string id, PurchaseEntryDocument document, CancellationToken cancellationToken);

    Task<PagedResult<(string Id, PurchaseEntryDocument Data)>> GetAllAsync(string? cursor, int pageSize, CancellationToken cancellationToken);

    /// <summary>Paged — backs the Supplier Detail screen's "View Purchase History".</summary>
    Task<PagedResult<(string Id, PurchaseEntryDocument Data)>> GetBySupplierIdAsync(string supplierId, string? cursor, int pageSize, CancellationToken cancellationToken);

    /// <summary>Unpaged — backs supplier statistics (purchase count, last purchase date), bounded by one supplier's realistic purchase-history size.</summary>
    Task<List<(string Id, PurchaseEntryDocument Data)>> GetAllBySupplierIdUnpagedAsync(string supplierId, CancellationToken cancellationToken);

    /// <summary>Unpaged — backs Inventory Dashboard aggregation (joins PurchaseDate onto purchaseItems, which don't carry it), bounded by the catalog's realistic purchase-history size.</summary>
    Task<List<(string Id, PurchaseEntryDocument Data)>> GetAllUnpagedAsync(CancellationToken cancellationToken);
}
