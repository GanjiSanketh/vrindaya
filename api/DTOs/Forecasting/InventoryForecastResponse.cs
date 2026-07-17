namespace Vrindaya.Api.DTOs.Forecasting;

public class InventoryForecastResponse
{
    public string VariantId { get; set; } = string.Empty;
    public string ProductId { get; set; } = string.Empty;
    public string ProductName { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string Color { get; set; } = string.Empty;
    public string Size { get; set; } = string.Empty;
    public string Sku { get; set; } = string.Empty;
    public string? Supplier { get; set; }

    public long CurrentStock { get; set; }
    public long SoldStock { get; set; }
    public double AverageMonthlySales { get; set; }
    public double DailyConsumptionRate { get; set; }
    public double EstimatedDaysRemaining { get; set; }
    public long MinimumStock { get; set; }
    public long MaximumStock { get; set; }
    public long IdealStock { get; set; }
    public long RecommendedReorderQuantity { get; set; }
    public string Status { get; set; } = "Healthy";
    public int LeadTimeDays { get; set; }
}

public class ForecastQuery
{
    public string? Status { get; set; }
    public string? Search { get; set; }
    public string? Category { get; set; }
    public string? Supplier { get; set; }
    public string? Cursor { get; set; }
    public int PageSize { get; set; } = 50;
}
