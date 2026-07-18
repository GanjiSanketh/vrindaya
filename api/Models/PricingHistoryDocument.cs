using Google.Cloud.Firestore;

namespace Vrindaya.Api.Models;

[FirestoreData]
public class PricingHistoryDocument
{
    [FirestoreProperty("pricingId")]
    public string PricingId { get; set; } = string.Empty;

    [FirestoreProperty("inventoryVariantId")]
    public string InventoryVariantId { get; set; } = string.Empty;

    [FirestoreProperty("marketplace")]
    public string Marketplace { get; set; } = string.Empty;

    [FirestoreProperty("oldListingPrice")]
    public double OldListingPrice { get; set; }

    [FirestoreProperty("newListingPrice")]
    public double NewListingPrice { get; set; }

    [FirestoreProperty("oldProfit")]
    public double OldProfit { get; set; }

    [FirestoreProperty("newProfit")]
    public double NewProfit { get; set; }

    [FirestoreProperty("changedBy")]
    public string ChangedBy { get; set; } = string.Empty;

    [FirestoreProperty("reason")]
    public string Reason { get; set; } = string.Empty;

    [FirestoreProperty("timestamp")]
    public DateTime Timestamp { get; set; }
}
