using Google.Cloud.Firestore;

namespace Vrindaya.Api.Models;

[FirestoreData]
public class MarketplacePricingProfileDocument
{
    [FirestoreProperty("marketplaceType")]
    public string MarketplaceType { get; set; } = string.Empty;

    [FirestoreProperty("commissionPercent")]
    public double CommissionPercent { get; set; }

    [FirestoreProperty("manualSellingPriceOverride")]
    public double? ManualSellingPriceOverride { get; set; }

    [FirestoreProperty("suggestedSellingPrice")]
    public double SuggestedSellingPrice { get; set; }

    [FirestoreProperty("totalCost")]
    public double TotalCost { get; set; }

    [FirestoreProperty("profitAmount")]
    public double ProfitAmount { get; set; }

    [FirestoreProperty("profitPercentage")]
    public double ProfitPercentage { get; set; }

    [FirestoreProperty("margin")]
    public double Margin { get; set; }

    [FirestoreProperty("mrp")]
    public double Mrp { get; set; }

    [FirestoreProperty("sellingPrice")]
    public double SellingPrice { get; set; }

    [FirestoreProperty("closingFee")]
    public double ClosingFee { get; set; }

    [FirestoreProperty("shippingCharge")]
    public double? ShippingCharge { get; set; }

    [FirestoreProperty("packagingCharge")]
    public double? PackagingCharge { get; set; }

    [FirestoreProperty("advertisementCost")]
    public double? AdvertisementCost { get; set; }

    [FirestoreProperty("miscellaneousCharges")]
    public double? MiscellaneousCharges { get; set; }

    [FirestoreProperty("expectedSettlement")]
    public double ExpectedSettlement { get; set; }

    [FirestoreProperty("netProfit")]
    public double NetProfit { get; set; }

    [FirestoreProperty("marginPercentage")]
    public double MarginPercentage { get; set; }
}
