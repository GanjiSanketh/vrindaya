namespace Vrindaya.Api.DTOs.Profitability;

public class ProductProfitabilityResponse
{
    public string ProductId { get; set; } = string.Empty;
    public string ProductName { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string Marketplace { get; set; } = string.Empty;

    public double PurchaseCost { get; set; }
    public double PackagingCost { get; set; }
    public double AdvertisementCost { get; set; }
    public double MarketplaceCommission { get; set; }
    public double ShippingCost { get; set; }
    public double MiscellaneousCost { get; set; }
    public double TotalCost { get; set; }

    public double SellingPrice { get; set; }
    public double ExpectedSettlement { get; set; }
    public double NetProfit { get; set; }
    public double ProfitPercentage { get; set; }
    public double RoiPercentage { get; set; }

    public long CurrentStock { get; set; }
    public long SoldStock { get; set; }
    public double Investment { get; set; }
    public double InventoryValue { get; set; }
    public double ExpectedRevenue { get; set; }
    public double ExpectedProfit { get; set; }
}

public class ProfitabilityQuery
{
    public string? Filter { get; set; }
    public string? Marketplace { get; set; }
    public string? Category { get; set; }
    public string? Search { get; set; }
    public string? Cursor { get; set; }
    public int PageSize { get; set; } = 50;
}
