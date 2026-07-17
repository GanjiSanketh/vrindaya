using Google.Cloud.Firestore;

namespace Vrindaya.Api.Models;

/// <summary>
/// Maps to a document in Firestore's inventoryVariants collection — one
/// document per (ProductId, Color, Size) combination, the actual unit of
/// stock now that inventory is tracked per variant instead of per product.
/// Doc id is deterministic — see
/// InventoryVariantRepository.ComputeVariantId — so a given product/color/
/// size can have at most one variant record by construction, the same
/// "id = natural key" trick as CategoryDocument's slug-as-id.
///
/// Deliberately separate from ProductDocument (never duplicated, never
/// written to) — linked only by ProductId, per the module's founding rule.
/// AveragePurchaseCost is server-computed by replaying this specific
/// variant's Confirmed purchaseItems from scratch (see
/// InventoryManagementService.RecomputeVariantAverageCostAsync), same
/// reasoning as the product-level version it replaces.
///
/// QrCode exists now purely as a stored field for a future feature — nothing
/// generates or reads it yet.
///
/// Pricing Engine — the 9 shared cost/strategy inputs below plus
/// MarketplaceProfiles (one per Constants/MarketplaceType.cs entry) replace
/// the old per-PRODUCT Pricing Calculator (InventoryRecordDocument,
/// retired) now that pricing strategy is tracked per variant. PurchaseCost
/// here is a manual planning input distinct from AveragePurchaseCost above
/// (which is auto-computed from actual purchase history) — deliberately
/// two different numbers for two different purposes.
/// </summary>
[FirestoreData]
public class InventoryVariantDocument
{
    [FirestoreProperty("productId")]
    public string ProductId { get; set; } = string.Empty;

    [FirestoreProperty("color")]
    public string Color { get; set; } = string.Empty;

    [FirestoreProperty("size")]
    public string Size { get; set; } = string.Empty;

    [FirestoreProperty("sku")]
    public string Sku { get; set; } = string.Empty;

    [FirestoreProperty("barcode")]
    public string? Barcode { get; set; }

    /// <summary>Future field — stored, not yet generated or consumed anywhere.</summary>
    [FirestoreProperty("qrCode")]
    public string? QrCode { get; set; }

    [FirestoreProperty("supplier")]
    public string? Supplier { get; set; }

    [FirestoreProperty("warehouse")]
    public string? Warehouse { get; set; }

    [FirestoreProperty("averagePurchaseCost")]
    public double AveragePurchaseCost { get; set; }

    [FirestoreProperty("currentStock")]
    public long CurrentStock { get; set; }

    [FirestoreProperty("reservedStock")]
    public long ReservedStock { get; set; }

    [FirestoreProperty("soldStock")]
    public long SoldStock { get; set; }

    [FirestoreProperty("returnedStock")]
    public long ReturnedStock { get; set; }

    [FirestoreProperty("damagedStock")]
    public long DamagedStock { get; set; }

    [FirestoreProperty("lowStockThreshold")]
    public long LowStockThreshold { get; set; }

    [FirestoreProperty("criticalStockThreshold")]
    public long? CriticalStockThreshold { get; set; }

    // ── Pricing Engine — shared cost/strategy inputs ──────────────────────
    [FirestoreProperty("purchaseCost")]
    public double PurchaseCost { get; set; }

    [FirestoreProperty("transportationCost")]
    public double TransportationCost { get; set; }

    [FirestoreProperty("packagingCost")]
    public double PackagingCost { get; set; }

    [FirestoreProperty("advertisingCost")]
    public double AdvertisingCost { get; set; }

    [FirestoreProperty("paymentGatewayChargePercent")]
    public double PaymentGatewayChargePercent { get; set; }

    [FirestoreProperty("shippingCost")]
    public double ShippingCost { get; set; }

    [FirestoreProperty("gstPercent")]
    public double GstPercent { get; set; }

    [FirestoreProperty("miscellaneousCost")]
    public double MiscellaneousCost { get; set; }

    [FirestoreProperty("desiredProfitPercent")]
    public double DesiredProfitPercent { get; set; }

    /// <summary>One per Constants/MarketplaceType.cs entry (Website/Flipkart/Amazon) — see MarketplacePricingProfileDocument.</summary>
    [FirestoreProperty("marketplaceProfiles")]
    public List<MarketplacePricingProfileDocument> MarketplaceProfiles { get; set; } = [];

    [FirestoreProperty("createdAt")]
    public DateTime CreatedAt { get; set; }

    [FirestoreProperty("updatedAt")]
    public DateTime UpdatedAt { get; set; }
}
