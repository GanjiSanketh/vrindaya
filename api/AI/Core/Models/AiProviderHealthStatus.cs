namespace Vrindaya.Api.AI.Core.Models;

/// <summary>
/// Strongly typed response for <see cref="Interfaces.IAiProvider.HealthCheckAsync"/>.
/// Reports provider reachability and round-trip latency.
/// </summary>
public sealed class AiProviderHealthStatus
{
    public bool IsHealthy { get; init; }

    public string Status { get; init; } = string.Empty;

    /// <summary>Round-trip latency measured by the health probe, in milliseconds.</summary>
    public long LatencyMs { get; init; }

    public DateTime Timestamp { get; init; } = DateTime.UtcNow;
}