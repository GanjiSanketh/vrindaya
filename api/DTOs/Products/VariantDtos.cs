using System.ComponentModel.DataAnnotations;

namespace Vrindaya.Api.DTOs.Products;

public class VariantResponse
{
    public string Id { get; set; } = string.Empty;
    public string ProductId { get; set; } = string.Empty;
    public string ColourName { get; set; } = string.Empty;
    public string? ColourHex { get; set; }
    public string Sku { get; set; } = string.Empty;
    public double? SellingPrice { get; set; }
    public double? Mrp { get; set; }
    public string? FlipkartUrl { get; set; }
    public int DisplayOrder { get; set; }
    public bool IsActive { get; set; }
    public bool IsFeatured { get; set; }
    public bool IsBestSeller { get; set; }
    public bool IsNewArrival { get; set; }
    public VariantImagesResponse Images { get; set; } = new();
    public List<VariantSizeResponse> Sizes { get; set; } = [];
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class VariantImagesResponse
{
    public string? Primary { get; set; }
    public string? Front { get; set; }
    public string? Back { get; set; }
    public string? Left { get; set; }
    public string? Right { get; set; }
    public string? Closeup { get; set; }
    public List<string> Gallery { get; set; } = [];
}

public class VariantSizeResponse
{
    public string Size { get; set; } = string.Empty;
    public long Stock { get; set; }
}

public class CreateVariantRequest
{
    [Required, MaxLength(100)]
    public string ColourName { get; set; } = string.Empty;

    [MaxLength(7)]
    public string? ColourHex { get; set; }

    [Required, MaxLength(100)]
    public string Sku { get; set; } = string.Empty;

    public double? SellingPrice { get; set; }
    public double? Mrp { get; set; }

    [Url, MaxLength(500)]
    public string? FlipkartUrl { get; set; }

    public int DisplayOrder { get; set; }
    public bool IsActive { get; set; } = true;
    public bool IsFeatured { get; set; }
    public bool IsBestSeller { get; set; }
    public bool IsNewArrival { get; set; }

    [Required, MinLength(1)]
    public List<UpsertVariantSize> Sizes { get; set; } = [];
}

public class UpdateVariantRequest
{
    [Required, MaxLength(100)]
    public string ColourName { get; set; } = string.Empty;

    [MaxLength(7)]
    public string? ColourHex { get; set; }

    [Required, MaxLength(100)]
    public string Sku { get; set; } = string.Empty;

    public double? SellingPrice { get; set; }
    public double? Mrp { get; set; }

    [Url, MaxLength(500)]
    public string? FlipkartUrl { get; set; }

    public int DisplayOrder { get; set; }
    public bool IsActive { get; set; } = true;
    public bool IsFeatured { get; set; }
    public bool IsBestSeller { get; set; }
    public bool IsNewArrival { get; set; }

    [Required, MinLength(1)]
    public List<UpsertVariantSize> Sizes { get; set; } = [];

    public VariantImagesInput? Images { get; set; }
}

public class UpsertVariantSize
{
    [Required, MaxLength(20)]
    public string Size { get; set; } = string.Empty;

    [Range(0, int.MaxValue)]
    public long Stock { get; set; }
}

public class VariantImagesInput
{
    public string? Primary { get; set; }
    public string? Front { get; set; }
    public string? Back { get; set; }
    public string? Left { get; set; }
    public string? Right { get; set; }
    public string? Closeup { get; set; }
    public List<string> Gallery { get; set; } = [];
}

public class VariantListResponse
{
    public List<VariantResponse> Variants { get; set; } = [];
}
