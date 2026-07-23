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
    public VariantImageSlotResponse? Primary { get; set; }
    public VariantImageSlotResponse? Front { get; set; }
    public VariantImageSlotResponse? Back { get; set; }
    public VariantImageSlotResponse? Left { get; set; }
    public VariantImageSlotResponse? Right { get; set; }
    public VariantImageSlotResponse? Closeup { get; set; }
    public List<VariantImageSlotResponse> Gallery { get; set; } = [];
}

public class VariantImageSlotResponse
{
    public string Url { get; set; } = string.Empty;
    public string PublicId { get; set; } = string.Empty;
    public int Width { get; set; }
    public int Height { get; set; }
    public string? Alt { get; set; }
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
    public VariantImageSlotInput? Primary { get; set; }
    public VariantImageSlotInput? Front { get; set; }
    public VariantImageSlotInput? Back { get; set; }
    public VariantImageSlotInput? Left { get; set; }
    public VariantImageSlotInput? Right { get; set; }
    public VariantImageSlotInput? Closeup { get; set; }
    public List<VariantImageSlotInput> Gallery { get; set; } = [];
}

public class VariantImageSlotInput
{
    public string Url { get; set; } = string.Empty;
    public string? PublicId { get; set; }
    public int Width { get; set; }
    public int Height { get; set; }
    public string? Alt { get; set; }
}



/// <summary>Embedded within product create/update requests — carries variant data inline.
/// Id is null for new variants and set for existing ones.</summary>
public class EmbeddedVariantRequest
{
    public string? Id { get; set; }

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

