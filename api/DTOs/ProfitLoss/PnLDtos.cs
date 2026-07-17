namespace Vrindaya.Api.DTOs.ProfitLoss;

public class PnLDashboardResponse
{
    public PnLSummary Summary { get; set; } = new();
    public PnLCostBreakdown Costs { get; set; } = new();
    public List<PnLMonthlySeries> MonthlySeries { get; set; } = [];
    public List<PnLYearlySeries> YearlySeries { get; set; } = [];
    public List<PnLCategoryBreakdown> CategoryBreakdown { get; set; } = [];
    public List<PnLSupplierBreakdown> SupplierBreakdown { get; set; } = [];
    public List<PnLMarketplaceBreakdown> MarketplaceBreakdown { get; set; } = [];
}

public class PnLSummary
{
    public double TotalRevenue { get; set; }
    public double TotalExpenses { get; set; }
    public double GrossProfit { get; set; }
    public double NetProfit { get; set; }
    public double InventoryInvestment { get; set; }
    public double InventoryValue { get; set; }
    public double ExpectedProfit { get; set; }
    public double RealizedProfit { get; set; }
}

public class PnLCostBreakdown
{
    public double PackagingCost { get; set; }
    public double AdvertisementCost { get; set; }
    public double MarketplaceCharges { get; set; }
    public double TransportationCost { get; set; }
}

public class PnLMonthlySeries
{
    public string Period { get; set; } = string.Empty;
    public double Revenue { get; set; }
    public double Expenses { get; set; }
    public double NetProfit { get; set; }
}

public class PnLYearlySeries
{
    public string Period { get; set; } = string.Empty;
    public double Revenue { get; set; }
    public double Expenses { get; set; }
    public double NetProfit { get; set; }
}

public class PnLCategoryBreakdown
{
    public string Category { get; set; } = string.Empty;
    public double Revenue { get; set; }
    public double Cost { get; set; }
    public double Profit { get; set; }
    public int Count { get; set; }
}

public class PnLSupplierBreakdown
{
    public string SupplierId { get; set; } = string.Empty;
    public string SupplierName { get; set; } = string.Empty;
    public double TotalPurchases { get; set; }
    public int PurchaseCount { get; set; }
}

public class PnLMarketplaceBreakdown
{
    public string Marketplace { get; set; } = string.Empty;
    public double Revenue { get; set; }
    public double Cost { get; set; }
    public double Profit { get; set; }
    public double Margin { get; set; }
    public int ListingCount { get; set; }
}
