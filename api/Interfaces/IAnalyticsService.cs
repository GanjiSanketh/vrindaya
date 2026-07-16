namespace Vrindaya.Api.Interfaces;

/// <summary>
/// Contract reserved for analytics/reporting operations.
/// </summary>
public interface IAnalyticsService
{
    /// <summary>Records a "Buy on Flipkart" click — increments Product.WebsiteClickCount atomically and stamps LastClickAt. Public/anonymous-triggered, no auth.</summary>
    Task RecordProductClickAsync(string productId, CancellationToken cancellationToken);
}
