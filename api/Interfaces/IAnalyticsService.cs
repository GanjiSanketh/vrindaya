using Vrindaya.Api.DTOs.Analytics;

namespace Vrindaya.Api.Interfaces;

/// <summary>
/// Contract for analytics/reporting operations. The write side is the legacy
/// "Buy on Flipkart" click; the read side powers the Admin Analytics dashboard
/// by aggregating the storefront-tracking `analytics` collection.
/// </summary>
public interface IAnalyticsService
{
    /// <summary>Records a "Buy on Flipkart" click — increments Product.WebsiteClickCount atomically and stamps LastClickAt. Public/anonymous-triggered, no auth. Server-side settings gate: skipped unless analyticsSettings/website has TrackingEnabled AND ProductClicks on.</summary>
    Task RecordProductClickAsync(string productId, CancellationToken cancellationToken);

    /// <summary>Dashboard summary — all-time + today's detail/flipkart click totals, and the count of tracked products.</summary>
    Task<AnalyticsOverviewResponse> GetOverviewAsync(CancellationToken cancellationToken);

    /// <summary>Top products by a metric — `sort` is `detail` or `flipkart`, `limit` is 1..100.</summary>
    Task<List<TopProductAnalyticsResponse>> GetTopProductsAsync(string sort, int limit, CancellationToken cancellationToken);

    /// <summary>Full per-product analytics (totals + daily breakdown), or null when the product has never been tracked.</summary>
    Task<ProductAnalyticsDetailResponse?> GetProductAnalyticsAsync(string productId, CancellationToken cancellationToken);
}
