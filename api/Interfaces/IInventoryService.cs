using Vrindaya.Api.DTOs.Inventory;
using Vrindaya.Api.DTOs.Products;
using Vrindaya.Api.Models;

namespace Vrindaya.Api.Interfaces;

/// <summary>
/// Scoped narrowly to stock adjustments — deliberately separate from the
/// general PUT update. A PUT replaces the whole editable product record
/// (an editorial operation); a stock adjustment is a narrow, partial write
/// so it can never clobber an unrelated field an editor is mid-edit on.
/// </summary>
public interface IInventoryService
{
    /// <summary>Recomputes the denormalized total from sizes and writes both fields. Returns the new total.</summary>
    Task<long> UpdateStockAsync(string productId, List<ProductSizeDocument> sizes, string updatedBy, CancellationToken cancellationToken);

    /// <summary>Full inventory picture for one product — Sizes/AvailableSizes/Stock/derived Low-Stock/Out-Of-Stock flags.</summary>
    Task<InventoryDetailResponse> GetInventoryAsync(string productId, CancellationToken cancellationToken);

    /// <summary>
    /// Writes sizes/stock/lowStockThreshold/autoHideWhenOutOfStock and stamps
    /// StockUpdatedAt. Automation: if AutoHideWhenOutOfStock is set and the
    /// new total is 0, also sets Active=false in the same write.
    /// </summary>
    Task<InventoryDetailResponse> UpdateInventoryAsync(string productId, UpdateInventoryRequest request, string updatedBy, CancellationToken cancellationToken);
}
