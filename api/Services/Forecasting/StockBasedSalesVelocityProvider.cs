using Vrindaya.Api.Interfaces;

namespace Vrindaya.Api.Services.Forecasting;

/// <summary>
/// Estimates sales velocity from historical soldStock and variant age.
/// When Order Management is implemented, replace this DI registration with
/// an OrderBasedSalesVelocityProvider that computes from actual order data.
/// </summary>
public class StockBasedSalesVelocityProvider : ISalesVelocityProvider
{
    private const double DaysInMonth = 30.44;

    public Task<double> GetAverageMonthlySalesAsync(string variantId, long soldStock, DateTime createdAt, CancellationToken cancellationToken)
    {
        var monthsSinceCreation = Math.Max(1, (DateTime.UtcNow - createdAt).TotalDays / DaysInMonth);
        var monthlySales = soldStock / monthsSinceCreation;
        return Task.FromResult(Math.Round(monthlySales, 2));
    }

    public Task<double> GetDailyConsumptionRateAsync(string variantId, long soldStock, DateTime createdAt, CancellationToken cancellationToken)
    {
        var monthsSinceCreation = Math.Max(1, (DateTime.UtcNow - createdAt).TotalDays / DaysInMonth);
        var monthlySales = soldStock / monthsSinceCreation;
        var dailyRate = monthlySales / DaysInMonth;
        return Task.FromResult(Math.Round(dailyRate, 4));
    }
}
