using Vrindaya.Api.Common;
using Vrindaya.Api.DTOs.InventoryManagement;

namespace Vrindaya.Api.Interfaces;

/// <summary>
/// Business logic for the Inventory Management module (dedicated
/// inventory/inventoryVariants/purchaseEntries/purchaseItems/stockMovements
/// collections) — the sole owner of stock quantity; ProductDocument.Sizes[].Stock
/// is legacy and no longer writable (its update path was removed).
/// </summary>
public interface IInventoryManagementService
{
    // ── Variant inventory (per Product+Color+Size) — includes the Pricing Engine ─

    Task<InventoryVariantResponse> GetVariantAsync(string variantId, CancellationToken cancellationToken);

    Task<List<InventoryVariantResponse>> GetVariantsByProductAsync(string productId, CancellationToken cancellationToken);

    Task<PagedResult<InventoryVariantResponse>> GetAllVariantsAsync(string? cursor, int pageSize, CancellationToken cancellationToken);

    Task<List<InventoryVariantResponse>> GetVariantsByStatusAsync(string status, CancellationToken cancellationToken);

    Task<InventoryVariantResponse> UpsertVariantAsync(string productId, UpsertInventoryVariantRequest request, string updatedBy, bool isSuperAdmin, CancellationToken cancellationToken);

    Task<List<InventoryVariantResponse>> BulkUpdateStockThresholdsAsync(BulkUpdateStockThresholdsRequest request, string updatedBy, CancellationToken cancellationToken);

    Task<InventoryVariantResponse> RecordMovementAsync(string variantId, RecordStockMovementRequest request, string actorEmail, CancellationToken cancellationToken);

    Task<List<InventoryVariantResponse>> GetLowStockVariantsAsync(CancellationToken cancellationToken);

    // ── Purchase Register ──────────────────────────────────────────────────
    Task<PurchaseEntryResponse> CreatePurchaseAsync(CreatePurchaseEntryRequest request, string createdBy, CancellationToken cancellationToken);

    /// <summary>Replaces the purchase's header + items wholesale, then reverses the prior inventory impact (if it was Confirmed) and reapplies the new one (if it's now Confirmed) — see the implementation's doc comment for the full transition algorithm.</summary>
    Task<PurchaseEntryResponse> UpdatePurchaseAsync(string id, UpdatePurchaseEntryRequest request, string updatedBy, CancellationToken cancellationToken);

    Task<PagedResult<PurchaseEntryResponse>> GetPurchaseEntriesAsync(string? cursor, int pageSize, CancellationToken cancellationToken);

    Task<PurchaseEntryResponse> GetPurchaseEntryAsync(string id, CancellationToken cancellationToken);

    Task<PagedResult<StockMovementResponse>> GetMovementsAsync(
        string? cursor, int pageSize, string? productId, string? movementType,
        string? search, DateTime? dateFrom, DateTime? dateTo, CancellationToken cancellationToken);

    Task<InventoryDashboardResponse> GetDashboardAsync(InventoryDashboardQuery query, CancellationToken cancellationToken);
}
