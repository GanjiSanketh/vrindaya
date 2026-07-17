namespace Vrindaya.Api.Interfaces;

/// <summary>
/// Pluggable provider for sales velocity data used in inventory forecasting.
/// Current implementation (StockBasedSalesVelocityProvider) estimates from
/// soldStock / monthsSinceCreation. When Order Management is built, register
/// an OrderBasedSalesVelocityProvider that computes from actual order line
/// items for more accurate forecasts — no other code changes needed.
/// </summary>
public interface ISalesVelocityProvider
{
    /// <summary>Average units sold per 30.44-day month.</summary>
    Task<double> GetAverageMonthlySalesAsync(string variantId, long soldStock, DateTime createdAt, CancellationToken cancellationToken);

    /// <summary>Average units sold per day.</summary>
    Task<double> GetDailyConsumptionRateAsync(string variantId, long soldStock, DateTime createdAt, CancellationToken cancellationToken);
}
