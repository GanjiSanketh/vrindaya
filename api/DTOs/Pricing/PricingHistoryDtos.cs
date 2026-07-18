namespace Vrindaya.Api.DTOs.Pricing;

public class PricingHistoryResponse
{
    public string Id { get; set; } = string.Empty;
    public string PricingId { get; set; } = string.Empty;
    public string InventoryVariantId { get; set; } = string.Empty;
    public string Marketplace { get; set; } = string.Empty;
    public double OldListingPrice { get; set; }
    public double NewListingPrice { get; set; }
    public double OldProfit { get; set; }
    public double NewProfit { get; set; }
    public string ChangedBy { get; set; } = string.Empty;
    public string Reason { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; }
}

public class PricingHistoryQuery
{
    public DateTime? FromDate { get; set; }
    public DateTime? ToDate { get; set; }
    public string? Cursor { get; set; }
    public int PageSize { get; set; } = 50;
}
