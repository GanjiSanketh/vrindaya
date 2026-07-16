using System.ComponentModel.DataAnnotations;

namespace Vrindaya.Api.DTOs.Products;

/// <summary>Single-product edit payload for PATCH /products/{id}/flipkart-ops — backs the Flipkart Ops admin screen's edit modal. Also carries the two pre-existing FlipkartProductUrl/FlipkartProductId fields (editable here too, same dual-write-path precedent as Sizes/stock). Lifecycle stage moved to InventoryController/LifecycleService in Phase 8 — no longer a Flipkart-specific concept.</summary>
public class UpdateFlipkartOpsRequest
{
    [Url]
    public string? FlipkartProductUrl { get; set; }

    public string? FlipkartProductId { get; set; }

    public string? FlipkartSellerSku { get; set; }

    public string? FlipkartFsn { get; set; }

    public DateTime? LaunchDate { get; set; }

    public DateTime? LastSyncDate { get; set; }

    [Range(0, double.MaxValue)]
    public double? MarketplacePrice { get; set; }

    [Range(0, double.MaxValue)]
    public double? MarketplaceMrp { get; set; }

    [Range(0, 100)]
    public double? MarketplaceDiscount { get; set; }

    public string? MarketplaceCategory { get; set; }

    public List<string> MarketplaceTags { get; set; } = [];
}
