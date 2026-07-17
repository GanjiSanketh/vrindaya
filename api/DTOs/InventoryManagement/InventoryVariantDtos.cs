using System.ComponentModel.DataAnnotations;
using Vrindaya.Api.Constants;

namespace Vrindaya.Api.DTOs.InventoryManagement;

public class InventoryVariantResponse
{
    public string Id { get; set; } = string.Empty;
    public string ProductId { get; set; } = string.Empty;
    public string? ProductName { get; set; }
    public string Color { get; set; } = string.Empty;
    public string Size { get; set; } = string.Empty;
    public string Sku { get; set; } = string.Empty;
    public string? Barcode { get; set; }
    public string? QrCode { get; set; }
    public string? Supplier { get; set; }
    public string? Warehouse { get; set; }
    public double AveragePurchaseCost { get; set; }
    public long CurrentStock { get; set; }
    public long ReservedStock { get; set; }
    public long SoldStock { get; set; }
    public long ReturnedStock { get; set; }
    public long DamagedStock { get; set; }
    public long LowStockThreshold { get; set; }
    public long CriticalStockThreshold { get; set; }

    public string Status { get; set; } = string.Empty;

    public double PurchaseCost { get; set; }
    public double TransportationCost { get; set; }
    public double PackagingCost { get; set; }
    public double AdvertisingCost { get; set; }
    public double PaymentGatewayChargePercent { get; set; }
    public double ShippingCost { get; set; }
    public double GstPercent { get; set; }
    public double MiscellaneousCost { get; set; }
    public double DesiredProfitPercent { get; set; }
    public List<MarketplaceProfileResponse> MarketplaceProfiles { get; set; } = [];

    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class MarketplaceProfileResponse
{
    public string MarketplaceType { get; set; } = string.Empty;
    public double CommissionPercent { get; set; }
    public double? ManualSellingPriceOverride { get; set; }
    public double SuggestedSellingPrice { get; set; }
    public double EffectiveSellingPrice { get; set; }
    public double TotalCost { get; set; }
    public double ProfitAmount { get; set; }
    public double ProfitPercentage { get; set; }
    public double Margin { get; set; }

    public double Mrp { get; set; }
    public double SellingPrice { get; set; }
    public double ClosingFee { get; set; }
    public double? ShippingCharge { get; set; }
    public double? PackagingCharge { get; set; }
    public double? AdvertisementCost { get; set; }
    public double? MiscellaneousCharges { get; set; }
    public double ExpectedSettlement { get; set; }
    public double NetProfit { get; set; }
    public double MarginPercentage { get; set; }
}

public class UpsertInventoryVariantRequest
{
    [Required]
    [MaxLength(60)]
    public string Color { get; set; } = string.Empty;

    [Required]
    [MaxLength(30)]
    public string Size { get; set; } = string.Empty;

    [MaxLength(64)]
    public string? Sku { get; set; }

    [MaxLength(64)]
    public string? Barcode { get; set; }

    [MaxLength(128)]
    public string? QrCode { get; set; }

    [MaxLength(120)]
    public string? Supplier { get; set; }

    [MaxLength(120)]
    public string? Warehouse { get; set; }

    [Range(0, long.MaxValue)]
    public long LowStockThreshold { get; set; }

    [Range(0, long.MaxValue)]
    public long CriticalStockThreshold { get; set; }

    [Range(0, double.MaxValue)]
    public double PurchaseCost { get; set; }

    [Range(0, double.MaxValue)]
    public double TransportationCost { get; set; }

    [Range(0, double.MaxValue)]
    public double PackagingCost { get; set; }

    [Range(0, double.MaxValue)]
    public double AdvertisingCost { get; set; }

    [Range(0, 100)]
    public double PaymentGatewayChargePercent { get; set; }

    [Range(0, double.MaxValue)]
    public double ShippingCost { get; set; }

    [Range(0, 100)]
    public double GstPercent { get; set; }

    [Range(0, double.MaxValue)]
    public double MiscellaneousCost { get; set; }

    [Range(0, 100)]
    public double DesiredProfitPercent { get; set; }

    [Required]
    [MinLength(1)]
    public List<MarketplaceProfileRequest> MarketplaceProfiles { get; set; } = [];
}

public class MarketplaceProfileRequest
{
    [Required]
    [AllowedValues(Vrindaya.Api.Constants.MarketplaceType.Website, Vrindaya.Api.Constants.MarketplaceType.Flipkart, Vrindaya.Api.Constants.MarketplaceType.Amazon)]
    public string MarketplaceType { get; set; } = string.Empty;

    [Range(0, 100)]
    public double CommissionPercent { get; set; }

    [Range(0, double.MaxValue)]
    public double? ManualSellingPriceOverride { get; set; }

    [Range(0, double.MaxValue)]
    public double Mrp { get; set; }

    [Range(0, double.MaxValue)]
    public double SellingPrice { get; set; }

    [Range(0, double.MaxValue)]
    public double ClosingFee { get; set; }

    [Range(0, double.MaxValue)]
    public double? ShippingCharge { get; set; }

    [Range(0, double.MaxValue)]
    public double? PackagingCharge { get; set; }

    [Range(0, double.MaxValue)]
    public double? AdvertisementCost { get; set; }

    [Range(0, double.MaxValue)]
    public double? MiscellaneousCharges { get; set; }
}

public class BulkUpdateStockThresholdsRequest
{
    [Required]
    [MinLength(1)]
    public List<string> VariantIds { get; set; } = [];

    [Range(0, long.MaxValue)]
    public long LowStockThreshold { get; set; }

    [Range(0, long.MaxValue)]
    public long CriticalStockThreshold { get; set; }
}

public class RecordStockMovementRequest
{
    [Required]
    [AllowedValues(StockMovementType.Sale, StockMovementType.Return, StockMovementType.Damage,
        StockMovementType.ManualAdjustment, StockMovementType.StockCorrection, StockMovementType.Transfer)]
    public string MovementType { get; set; } = string.Empty;

    public long? Quantity { get; set; }

    [Range(0, long.MaxValue)]
    public long? NewQuantity { get; set; }

    [Required]
    [MaxLength(240)]
    public string Reason { get; set; } = string.Empty;
}
