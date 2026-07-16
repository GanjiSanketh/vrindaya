using System.ComponentModel.DataAnnotations;

namespace Vrindaya.Api.DTOs.Products;

public class ProductSizeDto
{
    [Required]
    public string Size { get; set; } = string.Empty;

    [Range(0, long.MaxValue)]
    public long Stock { get; set; }
}
