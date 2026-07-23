namespace Vrindaya.Api.DTOs.Products;

public class PricingDashboardResponse
{
    public PricingSummary Summary { get; set; } = new();
    public List<ProductPricingDto> TopProfitable { get; set; } = [];
    public List<ProductPricingDto> LeastProfitable { get; set; } = [];
    public List<ProductPricingDto> SellingAtLoss { get; set; } = [];
    public List<ProductPricingDto> AllProducts { get; set; } = [];
}

public class PricingSummary
{
    public int TotalProducts { get; set; }
    public int ProfitableCount { get; set; }
    public int LossCount { get; set; }
    public double AverageProfitPercent { get; set; }
    public double TotalProfit { get; set; }
}

public class ProductPricingDto
{
    public string ProductId { get; set; } = string.Empty;
    public string ProductName { get; set; } = string.Empty;
    public string? ProductImage { get; set; }

    public double SellingPrice { get; set; }
    public double? Mrp { get; set; }
    public double? CostPrice { get; set; }

    public double PackagingCost { get; set; }
    public double ShippingCost { get; set; }
    public double CommissionPercent { get; set; }
    public double CommissionAmount { get; set; }
    public double GstPercent { get; set; }
    public double GstAmount { get; set; }

    public double TotalCost { get; set; }
    public double Profit { get; set; }
    public double ProfitPercent { get; set; }
    public double MarginPercent { get; set; }
    public double RecommendedSellingPrice { get; set; }
    public double MinimumSellingPrice { get; set; }

    public bool IsLoss { get; set; }
}

public class PricingDefaultsDto
{
    public double CommissionPercent { get; set; }
    public double PackagingCharge { get; set; }
    public double ShippingCharge { get; set; }
    public double GstPercent { get; set; }
    public double TargetProfitMargin { get; set; }
}
