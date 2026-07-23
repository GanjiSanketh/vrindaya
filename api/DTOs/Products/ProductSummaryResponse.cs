namespace Vrindaya.Api.DTOs.Products;

/// <summary>Light, list-item shape — omits Description/long text fields to keep list payloads small at "hundreds/thousands of products" scale.</summary>
public class ProductSummaryResponse
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string Sku { get; set; } = string.Empty;
    public double Price { get; set; }
    public double Mrp { get; set; }
    public double Discount { get; set; }
    public long Stock { get; set; }
    public bool Featured { get; set; }
    public bool NewArrival { get; set; }
    public bool BestSeller { get; set; }
    public bool Active { get; set; }
    public long DisplayOrder { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public double? CostPrice { get; set; }
    public string Brand { get; set; } = string.Empty;
    public string? FlipkartProductUrl { get; set; }
    public string? FlipkartProductId { get; set; }

    /// <summary>Soft-delete flag — admins use this to bucket the "Deleted" tab client-side.</summary>
    public bool Deleted { get; set; }
    public DateTime? DeletedAt { get; set; }

    /// <summary>
    /// Derived (not a persisted field) — the first image in Images[] by
    /// Order. Not stored separately in Firestore to avoid it drifting out
    /// of sync with Images[].
    /// </summary>
    public ProductImageDto? Thumbnail { get; set; }

    /* ─── Flipkart Operations (Phase 7) — read-only surface for the ops list/dashboard; written via PATCH /products/{id}/flipkart-ops or the bulk endpoints ─── */
    public string? FlipkartSellerSku { get; set; }
    public string? FlipkartFsn { get; set; }
    public DateTime? LaunchDate { get; set; }
    public DateTime? LastSyncDate { get; set; }
    public double? MarketplacePrice { get; set; }
    public double? MarketplaceMrp { get; set; }
    public double? MarketplaceDiscount { get; set; }
    public string? MarketplaceCategory { get; set; }
    public List<string> MarketplaceTags { get; set; } = [];
    public long WebsiteClickCount { get; set; }
    public DateTime? LastClickAt { get; set; }

    /* ─── Product Lifecycle & Inventory (Phase 8) ─── */

    /// <summary>One of Constants.LifecycleStage.All — replaces Phase 7's narrower ListingStatus.</summary>
    public string LifecycleStage { get; set; } = string.Empty;

    public int? LowStockThreshold { get; set; }
    public long ReservedStock { get; set; }
    public bool AutoHideWhenOutOfStock { get; set; }
    public DateTime? StockUpdatedAt { get; set; }

    /// <summary>Derived: Stock &lt;= 0. Never stored — always computed fresh.</summary>
    public bool IsOutOfStock { get; set; }

    /// <summary>Derived: LowStockThreshold set, and 0 &lt; Stock &lt;= LowStockThreshold. Mutually exclusive with IsOutOfStock.</summary>
    public bool IsLowStock { get; set; }

    /* ─── Variant summary (denormalized, updated on every variant sync) ─── */

    /// <summary>Number of active (non-deleted) colour variants.</summary>
    public int VariantCount { get; set; }

    /// <summary>Sum of stock across all variant sizes.</summary>
    public long TotalStock { get; set; }

    /// <summary>Lowest SellingPrice among variants (null if no variants).</summary>
    public double? LowestPrice { get; set; }

    /// <summary>Highest SellingPrice among variants (null if no variants).</summary>
    public double? HighestPrice { get; set; }
}
