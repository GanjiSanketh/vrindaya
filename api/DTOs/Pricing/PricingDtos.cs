using System.ComponentModel.DataAnnotations;

namespace Vrindaya.Api.DTOs.Pricing;

public class PricingResponse
{
    public string Id { get; set; } = string.Empty;
    public string InventoryVariantId { get; set; } = string.Empty;
    public string Marketplace { get; set; } = string.Empty;

    public double CostPrice { get; set; }
    public double PackingCharge { get; set; }
    public double ShippingCharge { get; set; }
    public double AdvertisingCharge { get; set; }
    public double MarketplaceCommission { get; set; }
    public double FixedMarketplaceFee { get; set; }
    public double PaymentGatewayCharge { get; set; }
    public double OtherCharges { get; set; }
    public double GstPercentage { get; set; }

    public double DesiredProfit { get; set; }

    public double Mrp { get; set; }
    public double ListingPrice { get; set; }
    public double? OfferPrice { get; set; }
    public double SuggestedSellingPrice { get; set; }

    public double ActualProfit { get; set; }
    public double MarginPercentage { get; set; }

    public string Currency { get; set; } = "INR";
    public bool IsActive { get; set; }

    public string CreatedBy { get; set; } = string.Empty;
    public string UpdatedBy { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class CreatePricingRequest
{
    [Required]
    public string InventoryVariantId { get; set; } = string.Empty;

    [Required]
    public string Marketplace { get; set; } = string.Empty;

    [Range(0, double.MaxValue)]
    public double CostPrice { get; set; }

    [Range(0, double.MaxValue)]
    public double PackingCharge { get; set; }

    [Range(0, double.MaxValue)]
    public double ShippingCharge { get; set; }

    [Range(0, double.MaxValue)]
    public double AdvertisingCharge { get; set; }

    [Range(0, double.MaxValue)]
    public double MarketplaceCommission { get; set; }

    [Range(0, double.MaxValue)]
    public double FixedMarketplaceFee { get; set; }

    [Range(0, double.MaxValue)]
    public double PaymentGatewayCharge { get; set; }

    [Range(0, double.MaxValue)]
    public double OtherCharges { get; set; }

    [Range(0, 100)]
    public double GstPercentage { get; set; }

    [Range(0, double.MaxValue)]
    public double DesiredProfit { get; set; }

    [Range(0, double.MaxValue)]
    public double Mrp { get; set; }

    [Range(0, double.MaxValue)]
    public double ListingPrice { get; set; }

    [Range(0, double.MaxValue)]
    public double? OfferPrice { get; set; }

    [MaxLength(3)]
    public string Currency { get; set; } = "INR";

    public bool IsActive { get; set; } = true;
}

public class UpdatePricingRequest
{
    [Range(0, double.MaxValue)]
    public double? CostPrice { get; set; }

    [Range(0, double.MaxValue)]
    public double? PackingCharge { get; set; }

    [Range(0, double.MaxValue)]
    public double? ShippingCharge { get; set; }

    [Range(0, double.MaxValue)]
    public double? AdvertisingCharge { get; set; }

    [Range(0, double.MaxValue)]
    public double? MarketplaceCommission { get; set; }

    [Range(0, double.MaxValue)]
    public double? FixedMarketplaceFee { get; set; }

    [Range(0, double.MaxValue)]
    public double? PaymentGatewayCharge { get; set; }

    [Range(0, double.MaxValue)]
    public double? OtherCharges { get; set; }

    [Range(0, 100)]
    public double? GstPercentage { get; set; }

    [Range(0, double.MaxValue)]
    public double? DesiredProfit { get; set; }

    [Range(0, double.MaxValue)]
    public double? Mrp { get; set; }

    [Range(0, double.MaxValue)]
    public double? ListingPrice { get; set; }

    [Range(0, double.MaxValue)]
    public double? OfferPrice { get; set; }

    [MaxLength(3)]
    public string? Currency { get; set; }

    public bool? IsActive { get; set; }

    [MaxLength(500)]
    public string? Reason { get; set; }
}

public class PricingQuery
{
    public string? Search { get; set; }
    public string? Marketplace { get; set; }
    public bool? IsActive { get; set; }
    public string? InventoryVariantId { get; set; }
    public string? SortBy { get; set; }
    public bool SortDescending { get; set; }
    public string? Cursor { get; set; }
    public int PageSize { get; set; } = 50;
}

public class ProductPricingSummaryResponse
{
    public string PricingId { get; set; } = string.Empty;
    public string InventoryVariantId { get; set; } = string.Empty;
    public string Marketplace { get; set; } = string.Empty;
    public string Color { get; set; } = string.Empty;
    public string Size { get; set; } = string.Empty;
    public string Sku { get; set; } = string.Empty;
    public double CostPrice { get; set; }
    public double TotalCost { get; set; }
    public double ListingPrice { get; set; }
    public double ActualProfit { get; set; }
    public double MarginPercentage { get; set; }
    public double SuggestedSellingPrice { get; set; }
    public bool IsOutdated { get; set; }
    public DateTime PricingUpdatedAt { get; set; }
    public DateTime VariantUpdatedAt { get; set; }
}

// ── Dashboard ──────────────────────────────────────────────────────────────

public class PricingDashboardResponse
{
    public double AverageProfit { get; set; }
    public double AverageMargin { get; set; }
    public PricingDashboardTopProduct? HighestProfitProduct { get; set; }
    public PricingDashboardTopProduct? LowestProfitProduct { get; set; }
    public int ProductsBelowTargetProfit { get; set; }
    public int ProductsWithNegativeProfit { get; set; }
    public int ProductsWithoutPricing { get; set; }
    public int ProductsWithOutdatedPricing { get; set; }

    public List<DistributionBucket> ProfitDistribution { get; set; } = new();
    public List<DistributionBucket> MarginDistribution { get; set; } = new();
    public List<MarketplaceBreakdown> MarketplaceComparison { get; set; } = new();
    public List<PricingDashboardTopProduct> Top20ProfitableProducts { get; set; } = new();
}

public class PricingDashboardTopProduct
{
    public string PricingId { get; set; } = string.Empty;
    public string InventoryVariantId { get; set; } = string.Empty;
    public string Marketplace { get; set; } = string.Empty;
    public string Color { get; set; } = string.Empty;
    public string Size { get; set; } = string.Empty;
    public string Sku { get; set; } = string.Empty;
    public double ListingPrice { get; set; }
    public double ActualProfit { get; set; }
    public double MarginPercentage { get; set; }
}

public class DistributionBucket
{
    public string Label { get; set; } = string.Empty;
    public int Count { get; set; }
}

public class MarketplaceBreakdown
{
    public string Marketplace { get; set; } = string.Empty;
    public int Count { get; set; }
    public double TotalProfit { get; set; }
    public double AverageProfit { get; set; }
    public double AverageMargin { get; set; }
}

// ── Recommendations ─────────────────────────────────────────────────────────

public class PricingRecommendationResponse
{
    public string OverallHealth { get; set; } = "Healthy";
    public PricingRecommendationSummary Summary { get; set; } = new();
    public List<PricingRecommendation> Recommendations { get; set; } = new();
}

public class PricingRecommendationSummary
{
    public double TotalCost { get; set; }
    public double ListingPrice { get; set; }
    public double ActualProfit { get; set; }
    public double MarginPercentage { get; set; }
    public double DesiredProfit { get; set; }
    public double SuggestedListingPrice { get; set; }
    public double ProfitToTarget { get; set; }
    public double TargetProfitMin { get; set; } = 150;
    public double TargetProfitMax { get; set; } = 200;
}

public class PricingRecommendation
{
    public string Type { get; set; } = string.Empty;
    public string Severity { get; set; } = "Info";
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string? SuggestedAction { get; set; }
}
