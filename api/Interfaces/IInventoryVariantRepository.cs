using Vrindaya.Api.Common;
using Vrindaya.Api.Models;

namespace Vrindaya.Api.Interfaces;

/// <summary>Pure Firestore data access over the inventoryVariants collection — no business logic (averaging/status computation lives in IInventoryManagementService).</summary>
public interface IInventoryVariantRepository
{
    Task<InventoryVariantDocument?> GetByIdAsync(string variantId, CancellationToken cancellationToken);

    /// <summary>Every variant of one product — powers the grouped-by-color Inventory Detail view.</summary>
    Task<List<(string Id, InventoryVariantDocument Data)>> GetAllByProductIdAsync(string productId, CancellationToken cancellationToken);

    Task<PagedResult<(string Id, InventoryVariantDocument Data)>> GetAllAsync(string? cursor, int pageSize, CancellationToken cancellationToken);

    /// <summary>Unpaged — used only by low-stock/dashboard aggregation, bounded by the catalog's realistic size (same accepted precedent as the product-level record it replaces).</summary>
    Task<List<(string Id, InventoryVariantDocument Data)>> GetAllUnpagedAsync(CancellationToken cancellationToken);

    /// <summary>Creates on first call for a given variant id, overwrites thereafter.</summary>
    Task UpsertAsync(string variantId, InventoryVariantDocument document, CancellationToken cancellationToken);
}
