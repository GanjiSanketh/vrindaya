using System.ComponentModel.DataAnnotations;

namespace Vrindaya.Api.DTOs.Products;

public class BulkStatusRequest
{
    [Required, MinLength(1)]
    public List<string> Ids { get; set; } = [];

    public bool Active { get; set; }
}
