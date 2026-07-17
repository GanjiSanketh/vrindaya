namespace Vrindaya.Api.DTOs.Marketplace;

public class FlipkartSettingsResponse
{
    public string MarketplaceName { get; set; } = "Flipkart";
    public bool MarketplaceEnabled { get; set; }
    public string SellerDisplayName { get; set; } = string.Empty;
    public string SellerId { get; set; } = string.Empty;
    public double DefaultShippingCharge { get; set; }
    public double DefaultPackagingCharge { get; set; }
    public double DefaultAdvertisementPercentage { get; set; }
    public double DefaultFlipkartCommissionPercentage { get; set; }
    public double DefaultPaymentGatewayCharges { get; set; }
    public double DefaultMiscellaneousCharges { get; set; }
    public double GstPercentage { get; set; }
    public double DefaultProfitMargin { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class UpdateFlipkartSettingsRequest
{
    public bool MarketplaceEnabled { get; set; }
    public string SellerDisplayName { get; set; } = string.Empty;
    public string SellerId { get; set; } = string.Empty;
    public double DefaultShippingCharge { get; set; }
    public double DefaultPackagingCharge { get; set; }
    public double DefaultAdvertisementPercentage { get; set; }
    public double DefaultFlipkartCommissionPercentage { get; set; }
    public double DefaultPaymentGatewayCharges { get; set; }
    public double DefaultMiscellaneousCharges { get; set; }
    public double GstPercentage { get; set; }
    public double DefaultProfitMargin { get; set; }
}
