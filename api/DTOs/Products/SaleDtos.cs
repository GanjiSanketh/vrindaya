namespace Vrindaya.Api.DTOs.Products;

public class SaleDto
{
    public string Id { get; set; } = string.Empty;
    public string ProductId { get; set; } = string.Empty;
    public string ProductName { get; set; } = string.Empty;
    public string? ProductImage { get; set; }
    public string VariantId { get; set; } = string.Empty;
    public string ColourName { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string Size { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public string SaleChannel { get; set; } = string.Empty;
    public double SellingPrice { get; set; }
    public double PurchaseCost { get; set; }
    public double PackagingCost { get; set; }
    public double FlipkartCommission { get; set; }
    public double ShippingCharges { get; set; }
    public double MarketingCost { get; set; }
    public double OtherCharges { get; set; }
    public double TotalCost { get; set; }
    public double AmountReceived { get; set; }
    public double Profit { get; set; }
    public string PaymentMethod { get; set; } = string.Empty;
    public string? CustomerName { get; set; }
    public string? CustomerPhone { get; set; }
    public string? InvoiceNumber { get; set; }
    public string? Notes { get; set; }
    public DateTime SoldAt { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CreateSaleRequest
{
    public string ProductId { get; set; } = string.Empty;
    public string VariantId { get; set; } = string.Empty;
    public string Size { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public string SaleChannel { get; set; } = string.Empty;
    public double SellingPrice { get; set; }
    public double FlipkartCommission { get; set; }
    public double ShippingCharges { get; set; }
    public double MarketingCost { get; set; }
    public double OtherCharges { get; set; }
    public string PaymentMethod { get; set; } = string.Empty;
    public string? CustomerName { get; set; }
    public string? CustomerPhone { get; set; }
    public string? InvoiceNumber { get; set; }
    public string? Notes { get; set; }
    public DateTime? SoldAt { get; set; }
}

public class SalesSummaryDto
{
    public double TotalRevenue { get; set; }
    public double TotalProfit { get; set; }
    public int TotalOrders { get; set; }
    public double TodayRevenue { get; set; }
    public double TodayProfit { get; set; }
    public int TodayOrders { get; set; }
    public double MonthlyRevenue { get; set; }
    public double MonthlyProfit { get; set; }
    public int MonthlyOrders { get; set; }
    public List<ChartDataPoint> RevenueByCategory { get; set; } = [];
    public List<ChartDataPoint> RevenueByChannel { get; set; } = [];
    public List<ChartDataPoint> ProfitByCategory { get; set; } = [];
    public List<ChartDataPoint> OrdersByChannel { get; set; } = [];
    public List<ChartDataPoint> PaymentMethodDistribution { get; set; } = [];
    public List<MonthlySalesTrend> MonthlyTrend { get; set; } = [];
    public List<ProductSalesDto> TopSellingProducts { get; set; } = [];
}

public class MonthlySalesTrend
{
    public string Month { get; set; } = string.Empty;
    public double Revenue { get; set; }
    public double Profit { get; set; }
    public int Orders { get; set; }
}

public class ProductSalesDto
{
    public string ProductId { get; set; } = string.Empty;
    public string ProductName { get; set; } = string.Empty;
    public string? ProductImage { get; set; }
    public int Quantity { get; set; }
    public double Revenue { get; set; }
    public double Profit { get; set; }
}
