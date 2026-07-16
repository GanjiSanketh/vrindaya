using System.ComponentModel.DataAnnotations;
using Vrindaya.Api.Models;

namespace Vrindaya.Api.DTOs.Products;

public class BulkFlagRequest
{
    [Required, MinLength(1)]
    public List<string> Ids { get; set; } = [];

    [Required]
    public ProductFlag Flag { get; set; }

    /// <summary>true = mark, false = remove.</summary>
    public bool Value { get; set; }
}
