using System.ComponentModel.DataAnnotations;
using Vrindaya.Api.Validators;

namespace Vrindaya.Api.DTOs.Products;

/// <summary>Shared editable fields between create and update — see CreateProductRequest/UpdateProductRequest.
/// Variant-specific fields (price, mrp, sku, sizes, color, flipkart links) are now managed per-variant
/// via the Variants list. Product-level legacy fields remain on the document for backward compatibility
/// but are no longer settable through this DTO.</summary>
public abstract class ProductRequestBase
{
    [Required, StringLength(200, MinimumLength = 3)]
    public string Name { get; set; } = string.Empty;

    [Required, SlugFormat]
    public string Slug { get; set; } = string.Empty;

    [Required]
    public string Category { get; set; } = string.Empty;

    public string? SubCategory { get; set; }

    [MaxLength(10000)]
    public string? Description { get; set; }

    [MaxLength(500)]
    public string? ShortDescription { get; set; }

    [MaxLength(100)]
    public string? Fabric { get; set; }

    [MaxLength(100)]
    public string? Pattern { get; set; }

    [MaxLength(100)]
    public string? Fit { get; set; }

    [MaxLength(100)]
    public string? Sleeve { get; set; }

    [MaxLength(100)]
    public string? Neck { get; set; }

    [MaxLength(100)]
    public string? Occasion { get; set; }

    [MaxLength(300)]
    public string? WashCare { get; set; }

    public PricingRequestDto? Pricing { get; set; }

    public List<string> Tags { get; set; } = [];

    public bool Featured { get; set; }
    public bool NewArrival { get; set; }
    public bool BestSeller { get; set; }
    public bool Active { get; set; } = true;
    public long DisplayOrder { get; set; }

    [MaxLength(10)]
    public List<ProductImageDto> Images { get; set; } = [];

    public string? Brand { get; set; }

    [MaxLength(200)]
    public string? SeoTitle { get; set; }

    [MaxLength(500)]
    public string? SeoDescription { get; set; }

    public List<string> SeoKeywords { get; set; } = [];

    [Range(0, int.MaxValue)]
    public int? LowStockThreshold { get; set; }

    public bool AutoHideWhenOutOfStock { get; set; }

    /// <summary>Variants to create/update — null means "don't touch variants" (backward compatible).
    /// New variants have Id=null, existing variants carry their Id, omitted variants are deleted.</summary>
    public List<EmbeddedVariantRequest>? Variants { get; set; }
}

/// <summary>Id is pre-issued from POST /products/ids and used for the Storage upload path before this call.</summary>
public class CreateProductRequest : ProductRequestBase
{
    [Required]
    public string Id { get; set; } = string.Empty;
}

public class UpdateProductRequest : ProductRequestBase
{
}

public class PricingRequestDto
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
