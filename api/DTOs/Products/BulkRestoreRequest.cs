using System.ComponentModel.DataAnnotations;

namespace Vrindaya.Api.DTOs.Products;

public class BulkRestoreRequest
{
    [Required, MinLength(1)]
    public List<string> Ids { get; set; } = [];
}
