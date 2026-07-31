namespace Vrindaya.Api.Interfaces;

/// <summary>
/// Pure Firestore data access for the `analytics` collection — the read
/// counterpart to the storefront's client-side tracking writes
/// (`analytics/{productId}` totals + `analytics/{productId}/daily/{YYYY-MM-DD}`
/// daily docs). Knows nothing about HTTP or products, only the analytics
/// collection — mirrors ProductRepository's separation of concerns.
/// </summary>
public interface IProductAnalyticsRepository
{
    /// <summary>Every totals document in `analytics` (all tracked products).</summary>
    Task<List<(string ProductId, Dictionary<string, object> Data)>> GetAllTotalsAsync(CancellationToken cancellationToken);

    /// <summary>Totals documents ordered by `sortField` descending, limited to `limit` rows.</summary>
    Task<List<(string ProductId, Dictionary<string, object> Data)>> GetTopAsync(string sortField, int limit, CancellationToken cancellationToken);

    /// <summary>A single product's totals document (`analytics/{productId}`), or null if never tracked.</summary>
    Task<Dictionary<string, object>?> GetTotalsAsync(string productId, CancellationToken cancellationToken);

    /// <summary>A product's daily documents (`analytics/{productId}/daily`), newest date first.</summary>
    Task<List<(string Date, Dictionary<string, object> Data)>> GetDailyAsync(string productId, CancellationToken cancellationToken);

    /// <summary>One batch-get (single round trip) of `analytics/{productId}/daily/{dateKey}` for every id — used for the dashboard's "today" totals.</summary>
    Task<List<(string ProductId, Dictionary<string, object> Data)>> GetDailyByDateAsync(List<string> productIds, string dateKey, CancellationToken cancellationToken);
}
