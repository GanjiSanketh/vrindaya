using Vrindaya.Api.Interfaces;

namespace Vrindaya.Api.Services.Forecasting;

/// <summary>
/// Returns a configurable default lead time (14 days).
/// Future implementations can look up per-supplier lead times from the
/// Suppliers collection or a dedicated lead-time configuration.
/// </summary>
public class ConfigLeadTimeProvider : ILeadTimeProvider
{
    private const int DefaultLeadTimeDays = 14;

    public Task<int> GetLeadTimeDaysAsync(string? supplier, CancellationToken cancellationToken)
    {
        return Task.FromResult(DefaultLeadTimeDays);
    }
}
