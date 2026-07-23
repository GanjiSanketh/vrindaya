using Google.Cloud.Firestore;
using Vrindaya.Api.Constants;

namespace Vrindaya.Api.Models;

/// <summary>
/// Maps to a document in Firestore's products collection — see
/// web/src/app/core/services/product-repository.service.ts (the prior,
/// now-retired direct-Angular writer of this exact schema; this model must
/// stay wire-compatible with documents already written by that path).
/// Verified round-trip (write via plain dictionary, read via ConvertTo,
/// including nested Sizes/Images lists and omitted-optional-field handling)
/// against the real Firestore project before this file was written.
/// </summary>
[FirestoreData]
public class ProductDocument
{
    [FirestoreProperty("name")]
    public string Name { get; set; } = string.Empty;

    [FirestoreProperty("slug")]
    public string Slug { get; set; } = string.Empty;

    [FirestoreProperty("category")]
    public string Category { get; set; } = string.Empty;

    [FirestoreProperty("subCategory")]
    public string? SubCategory { get; set; }

    [FirestoreProperty("description")]
    public string? Description { get; set; }

    [FirestoreProperty("shortDescription")]
    public string? ShortDescription { get; set; }

    [FirestoreProperty("price")]
    public double Price { get; set; }

    [FirestoreProperty("mrp")]
    public double Mrp { get; set; }

    [FirestoreProperty("discount")]
    public double Discount { get; set; }

    [FirestoreProperty("fabric")]
    public string? Fabric { get; set; }

    [FirestoreProperty("pattern")]
    public string? Pattern { get; set; }

    [FirestoreProperty("fit")]
    public string? Fit { get; set; }

    [FirestoreProperty("sleeve")]
    public string? Sleeve { get; set; }

    [FirestoreProperty("neck")]
    public string? Neck { get; set; }

    [FirestoreProperty("occasion")]
    public string? Occasion { get; set; }

    [FirestoreProperty("color")]
    public string? Color { get; set; }

    [FirestoreProperty("washCare")]
    public string? WashCare { get; set; }

    /// <summary>Per-size inventory ledger — source of truth for Stock below.</summary>
    [FirestoreProperty("sizes")]
    public List<ProductSizeDocument> Sizes { get; set; } = [];

    /// <summary>Denormalized total = sum(Sizes[].Stock). Recomputed on every write by InventoryService/ProductService, never hand-edited.</summary>
    [FirestoreProperty("stock")]
    public long Stock { get; set; }

    [FirestoreProperty("sku")]
    public string Sku { get; set; } = string.Empty;

    [FirestoreProperty("tags")]
    public List<string> Tags { get; set; } = [];

    [FirestoreProperty("featured")]
    public bool Featured { get; set; }

    [FirestoreProperty("newArrival")]
    public bool NewArrival { get; set; }

    [FirestoreProperty("bestSeller")]
    public bool BestSeller { get; set; }

    /// <summary>Public visibility gate — storefront (non-admin callers) only ever see Active == true.</summary>
    [FirestoreProperty("active")]
    public bool Active { get; set; }

    [FirestoreProperty("displayOrder")]
    public long DisplayOrder { get; set; }

    [FirestoreProperty("createdBy")]
    public string CreatedBy { get; set; } = string.Empty;

    [FirestoreProperty("createdAt")]
    public DateTime CreatedAt { get; set; }

    [FirestoreProperty("updatedBy")]
    public string UpdatedBy { get; set; } = string.Empty;

    [FirestoreProperty("updatedAt")]
    public DateTime UpdatedAt { get; set; }

    [FirestoreProperty("images")]
    public List<ProductImageDocument> Images { get; set; } = [];

    [FirestoreProperty("brand")]
    public string Brand { get; set; } = string.Empty;

    /// <summary>Cost price paid to acquire the product — used for profit calculations in the Pricing Dashboard.</summary>
    [FirestoreProperty("costPrice")]
    public double? CostPrice { get; set; }

    [FirestoreProperty("flipkartProductUrl")]
    public string? FlipkartProductUrl { get; set; }

    [FirestoreProperty("flipkartProductId")]
    public string? FlipkartProductId { get; set; }

    [FirestoreProperty("seoTitle")]
    public string? SeoTitle { get; set; }

    [FirestoreProperty("seoDescription")]
    public string? SeoDescription { get; set; }

    [FirestoreProperty("seoKeywords")]
    public List<string> SeoKeywords { get; set; } = [];

    /// <summary>Soft-delete flag. Set alongside Active=false by DeleteProductAsync so public active-only queries need no extra index dimension.</summary>
    [FirestoreProperty("deleted")]
    public bool Deleted { get; set; }

    [FirestoreProperty("deletedAt")]
    public DateTime? DeletedAt { get; set; }

    /// <summary>Lowercased, tokenized bag of words (name+brand+category+sku+tags) computed at write time by ProductService — powers GET /products/search's array-contains-any query. Firestore defaults this to [] on documents saved before this field existed.</summary>
    [FirestoreProperty("searchKeywords")]
    public List<string> SearchKeywords { get; set; } = [];

    /* ─── Flipkart Operations (Phase 7) ───────────────────────────────
       Purely admin-curated ops metadata — decoupled from Active/Deleted.
       FlipkartProductUrl/FlipkartProductId above stay the primary listing
       link/id; everything below is additive. ─────────────────────── */

    [FirestoreProperty("flipkartSellerSku")]
    public string? FlipkartSellerSku { get; set; }

    [FirestoreProperty("flipkartFsn")]
    public string? FlipkartFsn { get; set; }

    /// <summary>One of Constants.LifecycleStage.All — the 10-stage Product Lifecycle (Phase 8), replacing Phase 7's narrower 6-value ListingStatus. Firestore returns the C# default (Draft) for documents saved before this field existed.</summary>
    [FirestoreProperty("lifecycleStage")]
    public string LifecycleStage { get; set; } = Vrindaya.Api.Constants.LifecycleStage.Draft;

    /// <summary>Set by the per-product edit or by Bulk Launch (which also moves LifecycleStage to ListedOnFlipkart). "Launch Status" in the spec is derived from this being set, not a separately stored field.</summary>
    [FirestoreProperty("launchDate")]
    public DateTime? LaunchDate { get; set; }

    [FirestoreProperty("lastSyncDate")]
    public DateTime? LastSyncDate { get; set; }

    [FirestoreProperty("marketplacePrice")]
    public double? MarketplacePrice { get; set; }

    [FirestoreProperty("marketplaceMrp")]
    public double? MarketplaceMrp { get; set; }

    [FirestoreProperty("marketplaceDiscount")]
    public double? MarketplaceDiscount { get; set; }

    [FirestoreProperty("marketplaceCategory")]
    public string? MarketplaceCategory { get; set; }

    [FirestoreProperty("marketplaceTags")]
    public List<string> MarketplaceTags { get; set; } = [];

    /// <summary>Incremented atomically via FieldValue.Increment by AnalyticsService — never read-then-write.</summary>
    [FirestoreProperty("websiteClickCount")]
    public long WebsiteClickCount { get; set; }

    [FirestoreProperty("lastClickAt")]
    public DateTime? LastClickAt { get; set; }

    /* ─── Inventory (Phase 8) ──────────────────────────────────────────
       Stock/Sizes above stay the source of truth for quantity; everything
       below is additive inventory-management metadata. IsLowStock/
       IsOutOfStock/AvailableSizes are deliberately NOT stored here — they
       are derived at read time in ProductService so they can never drift
       out of sync with Stock. ─────────────────────────────────────── */

    [FirestoreProperty("lowStockThreshold")]
    public int? LowStockThreshold { get; set; }

    /// <summary>Reserved for future use (e.g. items held in an unpaid cart) — always 0 this phase, never written to.</summary>
    [FirestoreProperty("reservedStock")]
    public long ReservedStock { get; set; }

    /// <summary>Admin opt-in: when stock hits zero, InventoryService also sets Active=false in the same write.</summary>
    [FirestoreProperty("autoHideWhenOutOfStock")]
    public bool AutoHideWhenOutOfStock { get; set; }

    /// <summary>Stamped only by inventory-specific writes (UpdateStockAsync/UpdateInventoryAsync) — distinct from the general UpdatedAt, which any product edit touches.</summary>
    [FirestoreProperty("stockUpdatedAt")]
    public DateTime? StockUpdatedAt { get; set; }

    /* ─── Variant denormalized fields ─────────────────────────────────
       Computed during SyncVariantsAsync and written atomically with the
       product doc so list queries never need to scan the variants
       subcollection. ──────────────────────────────────────────────── */

    [FirestoreProperty("variantCount")]
    public int VariantCount { get; set; }

    [FirestoreProperty("totalStock")]
    public long TotalStock { get; set; }

    [FirestoreProperty("lowestPrice")]
    public double? LowestPrice { get; set; }

    [FirestoreProperty("highestPrice")]
    public double? HighestPrice { get; set; }
}

[FirestoreData]
public class ProductSizeDocument
{
    [FirestoreProperty("size")]
    public string Size { get; set; } = string.Empty;

    [FirestoreProperty("stock")]
    public long Stock { get; set; }
}

[FirestoreData]
public class ProductImageDocument
{
    [FirestoreProperty("url")]
    public string Url { get; set; } = string.Empty;

    [FirestoreProperty("publicId")]
    public string PublicId { get; set; } = string.Empty;

    /// <summary>Legacy-only: 'front'|'back'|'side'|'neck'|'sleeve'|'fabric'|'gallery-1'..'gallery-4' on documents written before the free-form gallery. New uploads never set this.</summary>
    [FirestoreProperty("slot")]
    public string? Slot { get; set; }

    [FirestoreProperty("order")]
    public int Order { get; set; }
}
