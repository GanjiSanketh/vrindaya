using System.ComponentModel.DataAnnotations;

namespace Vrindaya.Api.DTOs.ListingManagement;

public class ProductListingResponse
{
    public string Id { get; set; } = string.Empty;
    public string ProductId { get; set; } = string.Empty;
    public string? ProductName { get; set; }
    public string Marketplace { get; set; } = string.Empty;
    public string ListingStatus { get; set; } = string.Empty;
    public string ListingQuality { get; set; } = string.Empty;
    public string? FlipkartListingId { get; set; }
    public double MarketplacePrice { get; set; }
    public long Inventory { get; set; }
    public string SyncStatus { get; set; } = string.Empty;
    public DateTime? LastSyncedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class ProductListingQuery
{
    public string? Search { get; set; }
    public string? Marketplace { get; set; }
    public string? ListingStatus { get; set; }
    public string? ListingQuality { get; set; }
    public string? SyncStatus { get; set; }
    public string? Cursor { get; set; }
    public int PageSize { get; set; } = 20;
}

public class UpdateProductListingRequest
{
    [Required]
    [AllowedValues(Constants.ListingStatus.Draft, Constants.ListingStatus.Ready, Constants.ListingStatus.Published,
        Constants.ListingStatus.Rejected, Constants.ListingStatus.Inactive, Constants.ListingStatus.Archived)]
    public string ListingStatus { get; set; } = string.Empty;

    [AllowedValues(Constants.ListingQuality.High, Constants.ListingQuality.Medium, Constants.ListingQuality.Low)]
    public string? ListingQuality { get; set; }

    [MaxLength(128)]
    public string? FlipkartListingId { get; set; }

    [Range(0, double.MaxValue)]
    public double MarketplacePrice { get; set; }

    [Range(0, long.MaxValue)]
    public long Inventory { get; set; }

    [AllowedValues(Constants.SyncStatus.NotSynced, Constants.SyncStatus.Pending, Constants.SyncStatus.InSync, Constants.SyncStatus.SyncFailed)]
    public string? SyncStatus { get; set; }
}

public class BulkUpdateListingStatusRequest
{
    [Required]
    [MinLength(1)]
    public List<string> ListingIds { get; set; } = [];

    [Required]
    [AllowedValues(Constants.ListingStatus.Draft, Constants.ListingStatus.Ready, Constants.ListingStatus.Published,
        Constants.ListingStatus.Rejected, Constants.ListingStatus.Inactive, Constants.ListingStatus.Archived)]
    public string ListingStatus { get; set; } = string.Empty;
}
