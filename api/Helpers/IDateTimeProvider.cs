namespace Vrindaya.Api.Helpers;

/// <summary>
/// Abstracts the system clock so consumers (e.g. HealthService) stay unit-testable
/// instead of depending on DateTime.UtcNow directly.
/// </summary>
public interface IDateTimeProvider
{
    DateTime UtcNow { get; }
}
