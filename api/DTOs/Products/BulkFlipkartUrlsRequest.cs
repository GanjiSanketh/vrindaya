using System.ComponentModel.DataAnnotations;

namespace Vrindaya.Api.DTOs.Products;

/// <summary>Per-id url+sku pairs — URLs are unique per product, unlike the shared-value bulk actions (BulkLifecycleStageRequest/BulkLaunchRequest), so this can't be a single shared value.</summary>
public class BulkFlipkartUrlsRequest
{
    [Required, MinLength(1)]
    public List<BulkFlipkartUrlItem> Items { get; set; } = [];
}

public class BulkFlipkartUrlItem
{
    [Required]
    public string Id { get; set; } = string.Empty;

    [Url]
    public string? FlipkartProductUrl { get; set; }

    public string? FlipkartSellerSku { get; set; }
}
