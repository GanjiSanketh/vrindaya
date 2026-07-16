using System.ComponentModel.DataAnnotations;

namespace Vrindaya.Api.DTOs.Products;

public class ProductImageDto
{
    [Required, Url]
    public string Url { get; set; } = string.Empty;

    public string PublicId { get; set; } = string.Empty;

    /// <summary>Legacy-only — new uploads never set this. See ProductImageDocument.Slot.</summary>
    public string? Slot { get; set; }

    public int Order { get; set; }
}
