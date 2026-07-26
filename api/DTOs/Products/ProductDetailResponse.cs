namespace Vrindaya.Api.DTOs.Products;

/// <summary>Full product shape — GET /products/{id}, and the response to POST/PUT.
/// Variant-specific fields (price, mrp, sku, sizes, color, flipkart links) are now managed
/// per-variant. The legacy fields remain on the response for backward compatibility but will
/// be 0/empty for new products; consumers should read from Variants instead.</summary>
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

    public PricingResponseDto? Pricing { get; set; }
    public string Brand { get; set; } = string.Empty;
    public string? FlipkartProductUrl { get; set; }
    public string? FlipkartProductId { get; set; }
    public string? SeoTitle { get; set; }
    public string? SeoDescription { get; set; }
    public List<string> SeoKeywords { get; set; } = [];

    public bool Deleted { get; set; }
    public DateTime? DeletedAt { get; set; }

    public ProductImageDto? Thumbnail { get; set; }

    /* ─── Flipkart Operations (Phase 7) ─── */
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
    public string LifecycleStage { get; set; } = string.Empty;
    public int? LowStockThreshold { get; set; }
    public long ReservedStock { get; set; }
    public bool AutoHideWhenOutOfStock { get; set; }
    public DateTime? StockUpdatedAt { get; set; }
    public bool IsOutOfStock { get; set; }
    public bool IsLowStock { get; set; }

    /* ─── Variant denormalized fields (Phase 14) ─── */
    public int VariantCount { get; set; }
    public long TotalStock { get; set; }
    public double? LowestPrice { get; set; }
    public double? HighestPrice { get; set; }

    /* ─── Variants (inline) ─── */
    public List<VariantResponse> Variants { get; set; } = [];
}

public class PricingResponseDto
{
    public double? PurchaseCost { get; set; }
    public double? PackagingCharges { get; set; }
    public double? FlipkartCharges { get; set; }
    public double? OtherCharges { get; set; }
    public double? DesiredProfit { get; set; }
    public double? TotalCost { get; set; }
    public double? SellingPrice { get; set; }
    public double? ProfitMargin { get; set; }
    public double? Roi { get; set; }
}

/// <summary>Lightweight response for GET /products/{id}/images — variant image metadata only, no pricing/stock/description.</summary>
public class ProductImagesResponse
{
    public string ProductId { get; set; } = string.Empty;
    public List<VariantImageGroup> Variants { get; set; } = [];
}

public class VariantImageGroup
{
    public string VariantId { get; set; } = string.Empty;
    public string ColourName { get; set; } = string.Empty;
    public VariantImagesResponse Images { get; set; } = new();
}
