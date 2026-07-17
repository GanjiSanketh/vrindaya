using Google.Cloud.Firestore;

namespace Vrindaya.Api.Models;

[FirestoreData]
public class ProductListingDocument
{
    [FirestoreProperty("productId")]
    public string ProductId { get; set; } = string.Empty;

    [FirestoreProperty("marketplace")]
    public string Marketplace { get; set; } = string.Empty;

    [FirestoreProperty("listingStatus")]
    public string ListingStatus { get; set; } = string.Empty;

    [FirestoreProperty("listingQuality")]
    public string ListingQuality { get; set; } = string.Empty;

    [FirestoreProperty("flipkartListingId")]
    public string? FlipkartListingId { get; set; }

    [FirestoreProperty("marketplacePrice")]
    public double MarketplacePrice { get; set; }

    [FirestoreProperty("inventory")]
    public long Inventory { get; set; }

    [FirestoreProperty("syncStatus")]
    public string SyncStatus { get; set; } = string.Empty;

    [FirestoreProperty("lastSyncedAt")]
    public DateTime? LastSyncedAt { get; set; }

    [FirestoreProperty("createdAt")]
    public DateTime CreatedAt { get; set; }

    [FirestoreProperty("updatedAt")]
    public DateTime UpdatedAt { get; set; }

    [FirestoreProperty("updatedBy")]
    public string UpdatedBy { get; set; } = string.Empty;
}
