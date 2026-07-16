using System.ComponentModel.DataAnnotations;
using Vrindaya.Api.DTOs.Products;

namespace Vrindaya.Api.DTOs.Inventory;

/// <summary>PATCH /inventory/{productId} — a narrow, partial write for stock/threshold/auto-hide, separate from the full product PUT so it can never clobber an unrelated field an editor is mid-edit on.</summary>
public class UpdateInventoryRequest
{
    [Required, MinLength(1)]
    public List<ProductSizeDto> Sizes { get; set; } = [];

    [Range(0, int.MaxValue)]
    public int? LowStockThreshold { get; set; }

    public bool AutoHideWhenOutOfStock { get; set; }
}
