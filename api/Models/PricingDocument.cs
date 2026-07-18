using Google.Cloud.Firestore;

namespace Vrindaya.Api.Models;

[FirestoreData]
public class PricingDocument
{
    [FirestoreProperty("inventoryVariantId")]
    public string InventoryVariantId { get; set; } = string.Empty;

    [FirestoreProperty("marketplace")]
    public string Marketplace { get; set; } = string.Empty;

    [FirestoreProperty("costPrice")]
    public double CostPrice { get; set; }

    [FirestoreProperty("packingCharge")]
    public double PackingCharge { get; set; }

    [FirestoreProperty("shippingCharge")]
    public double ShippingCharge { get; set; }

    [FirestoreProperty("advertisingCharge")]
    public double AdvertisingCharge { get; set; }

    [FirestoreProperty("marketplaceCommission")]
    public double MarketplaceCommission { get; set; }

    [FirestoreProperty("fixedMarketplaceFee")]
    public double FixedMarketplaceFee { get; set; }

    [FirestoreProperty("paymentGatewayCharge")]
    public double PaymentGatewayCharge { get; set; }

    [FirestoreProperty("otherCharges")]
    public double OtherCharges { get; set; }

    [FirestoreProperty("gstPercentage")]
    public double GstPercentage { get; set; }

    [FirestoreProperty("desiredProfit")]
    public double DesiredProfit { get; set; }

    [FirestoreProperty("mrp")]
    public double Mrp { get; set; }

    [FirestoreProperty("listingPrice")]
    public double ListingPrice { get; set; }

    [FirestoreProperty("offerPrice")]
    public double? OfferPrice { get; set; }

    [FirestoreProperty("suggestedSellingPrice")]
    public double SuggestedSellingPrice { get; set; }

    [FirestoreProperty("actualProfit")]
    public double ActualProfit { get; set; }

    [FirestoreProperty("marginPercentage")]
    public double MarginPercentage { get; set; }

    [FirestoreProperty("currency")]
    public string Currency { get; set; } = "INR";

    [FirestoreProperty("isActive")]
    public bool IsActive { get; set; } = true;

    [FirestoreProperty("createdBy")]
    public string CreatedBy { get; set; } = string.Empty;

    [FirestoreProperty("updatedBy")]
    public string UpdatedBy { get; set; } = string.Empty;

    [FirestoreProperty("createdAt")]
    public DateTime CreatedAt { get; set; }

    [FirestoreProperty("updatedAt")]
    public DateTime UpdatedAt { get; set; }
}
