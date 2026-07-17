using Google.Cloud.Firestore;

namespace Vrindaya.Api.Models;

/// <summary>
/// Maps to a document in Firestore's purchaseItems collection — one document
/// per line item, auto-generated id, FK'd to its parent via PurchaseEntryId.
///
/// SupplierId and Status are denormalized copies of the parent
/// PurchaseEntryDocument's own SupplierId/Status at write time. Items are
/// always replaced wholesale on edit (old ones deleted, new ones created
/// fresh with the header's current Status/SupplierId baked in — see
/// InventoryManagementService.UpdatePurchaseAsync), so these denormalized
/// fields never drift out of sync with the header. This lets the collection
/// be queried directly for both purposes it exists to serve, with no join:
///   - SupplierService's stats/purchase-history (WhereEqualTo("supplierId", ...))
///   - InventoryManagementService's AveragePurchaseCost recompute, which
///     replays every Confirmed item for a product from scratch
///     (WhereEqualTo("productId", ...).WhereEqualTo("status", "Confirmed")) —
///     see RecomputeAverageCostAsync's doc comment for why a full replay
///     (rather than an incremental running average) is the correct approach
///     once purchases can be edited/cancelled after the fact.
///
/// Color/Size identify which InventoryVariantDocument (Product+Color+Size)
/// this line item's quantity actually applies to — the legacy
/// ProductDocument.Sizes[] path this comment used to reference has been
/// removed; InventoryVariantDocument.CurrentStock is now the sole source
/// of truth for stock quantity.
///
/// Total is server-computed and persisted (never trusted from the client) —
/// see InventoryManagementService's line-total formula.
/// </summary>
[FirestoreData]
public class PurchaseItemDocument
{
    [FirestoreProperty("purchaseEntryId")]
    public string PurchaseEntryId { get; set; } = string.Empty;

    [FirestoreProperty("supplierId")]
    public string? SupplierId { get; set; }

    [FirestoreProperty("status")]
    public string Status { get; set; } = string.Empty;

    [FirestoreProperty("productId")]
    public string ProductId { get; set; } = string.Empty;

    [FirestoreProperty("color")]
    public string? Color { get; set; }

    [FirestoreProperty("size")]
    public string? Size { get; set; }

    [FirestoreProperty("quantity")]
    public long Quantity { get; set; }

    [FirestoreProperty("purchasePrice")]
    public double PurchasePrice { get; set; }

    /// <summary>Flat amount (₹) off the line subtotal — not a percentage.</summary>
    [FirestoreProperty("discount")]
    public double Discount { get; set; }

    /// <summary>Percentage, applied to (Quantity × PurchasePrice − Discount).</summary>
    [FirestoreProperty("gst")]
    public double Gst { get; set; }

    /// <summary>Percentage, applied the same way as GST — a distinct additional surcharge, per spec.</summary>
    [FirestoreProperty("tax")]
    public double Tax { get; set; }

    /// <summary>Server-computed: (Quantity × PurchasePrice − Discount) × (1 + (Gst + Tax) / 100).</summary>
    [FirestoreProperty("total")]
    public double Total { get; set; }

    [FirestoreProperty("createdAt")]
    public DateTime CreatedAt { get; set; }
}
