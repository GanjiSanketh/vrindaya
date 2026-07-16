namespace Vrindaya.Api.DTOs.Products;

/// <summary>Full product shape — GET /products/{id}, and the response to POST/PUT.</summary>
public class ProductDetailResponse
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string? SubCategory { get; set; }
    public string? Description { get; set; }
    public string? ShortDescription { get; set; }
    public double Price { get; set; }
    public double Mrp { get; set; }
    public double Discount { get; set; }
    public string? Fabric { get; set; }
    public string? Pattern { get; set; }
    public string? Fit { get; set; }
    public string? Sleeve { get; set; }
    public string? Neck { get; set; }
    public string? Occasion { get; set; }
    public string? Color { get; set; }
    public string? WashCare { get; set; }
    public List<ProductSizeDto> Sizes { get; set; } = [];
    public long Stock { get; set; }
    public string Sku { get; set; } = string.Empty;
    public List<string> Tags { get; set; } = [];
    public bool Featured { get; set; }
    public bool NewArrival { get; set; }
    public bool BestSeller { get; set; }
    public bool Active { get; set; }
    public long DisplayOrder { get; set; }
    public string CreatedBy { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public string UpdatedBy { get; set; } = string.Empty;
    public DateTime UpdatedAt { get; set; }
    public List<ProductImageDto> Images { get; set; } = [];

    public string Brand { get; set; } = string.Empty;
    public string? FlipkartProductUrl { get; set; }
    public string? FlipkartProductId { get; set; }
    public string? SeoTitle { get; set; }
    public string? SeoDescription { get; set; }
    public List<string> SeoKeywords { get; set; } = [];

    public bool Deleted { get; set; }
    public DateTime? DeletedAt { get; set; }

    /// <summary>Derived — see ProductSummaryResponse.Thumbnail.</summary>
    public ProductImageDto? Thumbnail { get; set; }

    /* ─── Flipkart Operations (Phase 7) — see ProductSummaryResponse ─── */
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

    /* ─── Product Lifecycle & Inventory (Phase 8) — see ProductSummaryResponse ─── */
    public string LifecycleStage { get; set; } = string.Empty;
    public int? LowStockThreshold { get; set; }
    public long ReservedStock { get; set; }
    public bool AutoHideWhenOutOfStock { get; set; }
    public DateTime? StockUpdatedAt { get; set; }
    public bool IsOutOfStock { get; set; }
    public bool IsLowStock { get; set; }
}
