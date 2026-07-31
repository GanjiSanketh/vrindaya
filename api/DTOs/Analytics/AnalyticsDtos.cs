namespace Vrindaya.Api.DTOs.Analytics;

/// <summary>Aggregate read model for the Analytics dashboard's summary row — totals + today's counters + tracked-product count, derived from the `analytics` collection written by the storefront tracking layer.</summary>
public class AnalyticsOverviewResponse
{
    public long TotalDetailClicks { get; set; }
    public long TotalFlipkartClicks { get; set; }
    public long TodayDetailClicks { get; set; }
    public long TodayFlipkartClicks { get; set; }
    public int TotalProductsTracked { get; set; }
}

/// <summary>One row of the Top Viewed / Top Flipkart tables — the metric totals joined with the product's name/image (resolved from `products`).</summary>
public class TopProductAnalyticsResponse
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Image { get; set; }
    public long DetailClicks { get; set; }
    public long FlipkartClicks { get; set; }
    public DateTime? LastClickedAt { get; set; }
}

/// <summary>Per-product analytics detail — totals doc plus the daily breakdown (newest first).</summary>
public class ProductAnalyticsDetailResponse
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Image { get; set; }
    public long TotalDetailClicks { get; set; }
    public long TotalFlipkartClicks { get; set; }
    public DateTime? LastClickedAt { get; set; }
    public List<DailyProductAnalyticsResponse> Daily { get; set; } = [];
}

/// <summary>One `YYYY-MM-DD` row of a product's daily analytics.</summary>
public class DailyProductAnalyticsResponse
{
    public string Date { get; set; } = string.Empty;
    public long DetailClicks { get; set; }
    public long FlipkartClicks { get; set; }
    public DateTime? LastClickedAt { get; set; }
}
