using Google.Cloud.Firestore;

namespace Vrindaya.Api.Models;

[FirestoreData]
public class MarketplaceSettingsDocument
{
    [FirestoreProperty("marketplaceName")]
    public string MarketplaceName { get; set; } = string.Empty;

    [FirestoreProperty("marketplaceEnabled")]
    public bool MarketplaceEnabled { get; set; }

    [FirestoreProperty("sellerDisplayName")]
    public string SellerDisplayName { get; set; } = string.Empty;

    [FirestoreProperty("sellerId")]
    public string SellerId { get; set; } = string.Empty;

    [FirestoreProperty("defaultShippingCharge")]
    public double DefaultShippingCharge { get; set; }

    [FirestoreProperty("defaultPackagingCharge")]
    public double DefaultPackagingCharge { get; set; }

    [FirestoreProperty("defaultAdvertisementPercentage")]
    public double DefaultAdvertisementPercentage { get; set; }

    [FirestoreProperty("defaultFlipkartCommissionPercentage")]
    public double DefaultFlipkartCommissionPercentage { get; set; }

    [FirestoreProperty("defaultPaymentGatewayCharges")]
    public double DefaultPaymentGatewayCharges { get; set; }

    [FirestoreProperty("defaultMiscellaneousCharges")]
    public double DefaultMiscellaneousCharges { get; set; }

    [FirestoreProperty("gstPercentage")]
    public double GstPercentage { get; set; }

    [FirestoreProperty("defaultProfitMargin")]
    public double DefaultProfitMargin { get; set; }

    [FirestoreProperty("updatedBy")]
    public string UpdatedBy { get; set; } = string.Empty;

    [FirestoreProperty("updatedAt")]
    public DateTime UpdatedAt { get; set; }
}
