using System.ComponentModel.DataAnnotations;

namespace Vrindaya.Api.DTOs.Products;

public class UpdateStockRequest
{
    [Required, MinLength(1)]
    public List<ProductSizeDto> Sizes { get; set; } = [];
}

public class UpdateStockResponse
{
    public long Stock { get; set; }
}
