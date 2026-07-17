using Vrindaya.Api.DTOs.InventoryManagement;

namespace Vrindaya.Api.DTOs.ListingManagement;

public class MarketplaceDashboardResponse
{
    public int TotalListings { get; set; }
    public int PublishedCount { get; set; }
    public int RejectedCount { get; set; }
    public int DraftCount { get; set; }
    public double InventoryValue { get; set; }
    public double PotentialRevenue { get; set; }
    public double ExpectedProfit { get; set; }
    public double AverageMargin { get; set; }
    public int LowStockCount { get; set; }
    public int OutOfStockCount { get; set; }

    public List<NamedValue> InventoryByCategory { get; set; } = [];
    public List<NamedValue> ProfitByCategory { get; set; } = [];
    public List<NamedValue> InvestmentBySupplier { get; set; } = [];
    public List<NamedValue> MarketplaceMargin { get; set; } = [];
}
