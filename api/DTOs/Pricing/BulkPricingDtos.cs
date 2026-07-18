namespace Vrindaya.Api.DTOs.Pricing;

public enum BulkOperation
{
    IncreasePercent,
    DecreasePercent,
    FixedAmount
}

public class BulkFieldUpdate
{
    public BulkOperation Operation { get; set; }
    public double Value { get; set; }
}

public class BulkPricingUpdateRequest
{
    public List<string> PricingIds { get; set; } = [];
    public BulkFieldUpdate? PackingCharge { get; set; }
    public BulkFieldUpdate? AdvertisingCharge { get; set; }
    public BulkFieldUpdate? DesiredProfit { get; set; }
    public BulkFieldUpdate? MarketplaceCommission { get; set; }
}

public class BulkPricingPreviewResponse
{
    public List<PricingPreviewItem> Items { get; set; } = [];
    public int AffectedCount { get; set; }
}

public class PricingPreviewItem
{
    public string PricingId { get; set; } = string.Empty;
    public string Marketplace { get; set; } = string.Empty;
    public string Color { get; set; } = string.Empty;
    public string Size { get; set; } = string.Empty;
    public string Sku { get; set; } = string.Empty;

    public double CurrentPackingCharge { get; set; }
    public double? NewPackingCharge { get; set; }

    public double CurrentAdvertisingCharge { get; set; }
    public double? NewAdvertisingCharge { get; set; }

    public double CurrentDesiredProfit { get; set; }
    public double? NewDesiredProfit { get; set; }

    public double CurrentMarketplaceCommission { get; set; }
    public double? NewMarketplaceCommission { get; set; }

    public double CurrentTotalCost { get; set; }
    public double NewTotalCost { get; set; }

    public double CurrentListingPrice { get; set; }
    public double NewListingPrice { get; set; }

    public double CurrentProfit { get; set; }
    public double NewProfit { get; set; }
    public double ProfitDifference { get; set; }
}
