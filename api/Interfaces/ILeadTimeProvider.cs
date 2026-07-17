namespace Vrindaya.Api.Interfaces;

/// <summary>
/// Provides lead time (in days) for inventory replenishment.
/// Current implementation returns a configurable default (14 days).
/// Future implementations could look up supplier-specific lead times
/// from a Suppliers collection or a dedicated lead-time table.
/// </summary>
public interface ILeadTimeProvider
{
    Task<int> GetLeadTimeDaysAsync(string? supplier, CancellationToken cancellationToken);
}
