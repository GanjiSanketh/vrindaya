namespace Vrindaya.Api.DTOs.Products;

public class DashboardDto
{
    public SummaryCardsDto SummaryCards { get; set; } = new();
    public ProfitAnalyticsDto ProfitAnalytics { get; set; } = new();
    public List<CategoryAnalyticsDto> CategoryAnalytics { get; set; } = [];
    public List<LowStockProductDto> LowStockProducts { get; set; } = [];
    public List<ProductSummaryDto> TopExpensiveProducts { get; set; } = [];
    public List<ProductProfitDto> MostProfitableProducts { get; set; } = [];
    public List<ProductSummaryDto> RecentlyAddedProducts { get; set; } = [];
    public List<OutOfStockProductDto> OutOfStockProducts { get; set; } = [];

    // Pie charts
    public List<ChartDataPoint> InventoryByCategory { get; set; } = [];
    public List<ChartDataPoint> InventoryValueDistribution { get; set; } = [];
    public List<ChartDataPoint> RevenueDistribution { get; set; } = [];
    public List<ChartDataPoint> ProfitDistribution { get; set; } = [];
    public List<ChartDataPoint> ProductStatusDistribution { get; set; } = [];

    // Bar charts
    public List<BarDataPoint> TopRevenueProducts { get; set; } = [];
    public List<BarDataPoint> TopProfitProducts { get; set; } = [];
    public List<BarDataPoint> StockPerProduct { get; set; } = [];
    public List<CategoryCostPriceDto> PurchaseCostVsSellingPrice { get; set; } = [];

    // Donut chart
    public List<ChartDataPoint> ProductTypeDistribution { get; set; } = [];

    // Sales summary
    public SalesSummaryDto SalesSummary { get; set; } = new();

    // Summary
    public TodaySnapshotDto TodaySnapshot { get; set; } = new();
}

public class SummaryCardsDto
{
    public int TotalProducts { get; set; }
    public int TotalVariants { get; set; }
    public long InventoryQuantity { get; set; }
    public double InventoryValue { get; set; }
    public double PotentialSalesValue { get; set; }
    public double ExpectedProfit { get; set; }
    public double AverageProfitPercent { get; set; }
    public double AverageRoiPercent { get; set; }
}

public class ProfitAnalyticsDto
{
    public double AverageProfitPercent { get; set; }
    public double AverageRoiPercent { get; set; }
    public double AverageSellingPrice { get; set; }
    public double AveragePurchaseCost { get; set; }
    public ProductProfitInfo? HighestMarginProduct { get; set; }
    public ProductProfitInfo? LowestMarginProduct { get; set; }
}

public class ProductProfitInfo
{
    public string ProductId { get; set; } = string.Empty;
    public string ProductName { get; set; } = string.Empty;
    public string? ImageUrl { get; set; }
    public string? VariantName { get; set; }
    public double ProfitPercent { get; set; }
    public double Profit { get; set; }
}

public class CategoryAnalyticsDto
{
    public string Category { get; set; } = string.Empty;
    public int ProductCount { get; set; }
    public long TotalStock { get; set; }
    public double InventoryValue { get; set; }
    public double ExpectedProfit { get; set; }
}

public class LowStockProductDto
{
    public string ProductId { get; set; } = string.Empty;
    public string ProductName { get; set; } = string.Empty;
    public string? ImageUrl { get; set; }
    public string Category { get; set; } = string.Empty;
    public long Stock { get; set; }
    public double SellingPrice { get; set; }
}

public class ProductSummaryDto
{
    public string ProductId { get; set; } = string.Empty;
    public string ProductName { get; set; } = string.Empty;
    public string? ImageUrl { get; set; }
    public string Category { get; set; } = string.Empty;
    public double SellingPrice { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class ProductProfitDto
{
    public string ProductId { get; set; } = string.Empty;
    public string ProductName { get; set; } = string.Empty;
    public string? ImageUrl { get; set; }
    public string Category { get; set; } = string.Empty;
    public double SellingPrice { get; set; }
    public double TotalCost { get; set; }
    public double Profit { get; set; }
    public double ProfitPercent { get; set; }
}

public class OutOfStockProductDto
{
    public string ProductId { get; set; } = string.Empty;
    public string ProductName { get; set; } = string.Empty;
    public string? ImageUrl { get; set; }
    public string Category { get; set; } = string.Empty;
    public long Stock { get; set; }
}

public class ChartDataPoint
{
    public string Label { get; set; } = string.Empty;
    public double Value { get; set; }
}

public class BarDataPoint
{
    public string Label { get; set; } = string.Empty;
    public double Value { get; set; }
}

public class CategoryCostPriceDto
{
    public string Category { get; set; } = string.Empty;
    public double PurchaseCost { get; set; }
    public double SellingPrice { get; set; }
}

public class TodaySnapshotDto
{
    public int Products { get; set; }
    public int Variants { get; set; }
    public long TotalUnits { get; set; }
    public double InventoryCost { get; set; }
    public double PotentialRevenue { get; set; }
    public double ExpectedProfit { get; set; }
    public double AverageMarginPercent { get; set; }
    public double AverageRoiPercent { get; set; }
}
