using System.ComponentModel.DataAnnotations;
using Vrindaya.Api.Validators;

namespace Vrindaya.Api.DTOs.Products;

/// <summary>Shared editable fields between create and update — see CreateProductRequest/UpdateProductRequest.</summary>
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

    [Range(0, double.MaxValue)]
    public double Price { get; set; }

    [Range(0, double.MaxValue)]
    public double Mrp { get; set; }

    [Range(0, 100)]
    public double Discount { get; set; }

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

    [MaxLength(100)]
    public string? Color { get; set; }

    [MaxLength(300)]
    public string? WashCare { get; set; }

    public List<ProductSizeDto> Sizes { get; set; } = [];

    [Required]
    public string Sku { get; set; } = string.Empty;

    public List<string> Tags { get; set; } = [];

    public bool Featured { get; set; }
    public bool NewArrival { get; set; }
    public bool BestSeller { get; set; }
    public bool Active { get; set; } = true;
    public long DisplayOrder { get; set; }

    [MaxLength(10)]
    public List<ProductImageDto> Images { get; set; } = [];

    public string? Brand { get; set; }

    [Url]
    public string? FlipkartProductUrl { get; set; }

    public string? FlipkartProductId { get; set; }

    [MaxLength(200)]
    public string? SeoTitle { get; set; }

    [MaxLength(500)]
    public string? SeoDescription { get; set; }

    public List<string> SeoKeywords { get; set; } = [];

    [Range(0, int.MaxValue)]
    public int? LowStockThreshold { get; set; }

    public bool AutoHideWhenOutOfStock { get; set; }
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
