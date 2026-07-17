using Vrindaya.Api.Models;

namespace Vrindaya.Api.Interfaces;

/// <summary>Line-item access for the purchaseItems collection — see PurchaseItemDocument's doc comment for why SupplierId/Status are denormalized onto every item.</summary>
public interface IPurchaseItemRepository
{
    /// <summary>Single WriteBatch — matches CategoryRepository.ReorderAsync's precedent for bounded bulk writes.</summary>
    Task CreateManyAsync(List<PurchaseItemDocument> items, CancellationToken cancellationToken);

    Task<List<(string Id, PurchaseItemDocument Data)>> GetByPurchaseEntryIdAsync(string purchaseEntryId, CancellationToken cancellationToken);

    /// <summary>Used only when replacing a purchase's items wholesale on edit (see InventoryManagementService.UpdatePurchaseAsync) — never exposed as a standalone "delete a purchase" operation.</summary>
    Task DeleteByPurchaseEntryIdAsync(string purchaseEntryId, CancellationToken cancellationToken);

    /// <summary>Every Confirmed item ever recorded for one exact (Product, Color, Size) variant, across all purchases — the input to AveragePurchaseCost's full-replay recompute. Three equality filters, no orderBy — no composite index needed (verified live).</summary>
    Task<List<PurchaseItemDocument>> GetConfirmedByVariantAsync(string productId, string color, string size, CancellationToken cancellationToken);

    /// <summary>Unpaged — backs Supplier statistics (total amount purchased, distinct products purchased).</summary>
    Task<List<PurchaseItemDocument>> GetBySupplierIdAsync(string supplierId, CancellationToken cancellationToken);

    /// <summary>Every purchase item ever recorded, across all purchases — backs Inventory Dashboard aggregation (Today's Purchases, Purchases by Month, Supplier Distribution, category cost rollups), bounded by the catalog's realistic size.</summary>
    Task<List<(string Id, PurchaseItemDocument Data)>> GetAllUnpagedAsync(CancellationToken cancellationToken);
}
