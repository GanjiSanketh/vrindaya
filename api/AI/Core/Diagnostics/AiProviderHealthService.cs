using Microsoft.Extensions.Logging;
using Vrindaya.Api.AI.Core.Configuration;
using Vrindaya.Api.AI.Core.Interfaces;
using Vrindaya.Api.AI.Core.Models;

namespace Vrindaya.Api.AI.Core.Diagnostics;

/// <summary>
/// Default <see cref="IAiProviderHealthService"/>. Composes the live provider
/// selection with the rolling per-operation telemetry already collected by
/// <see cref="IAiDiagnostics"/> into a single, strongly typed health report for
/// the provider that is currently serving requests.
///
/// Deliberately read-only: no provider call is triggered, no state is mutated,
/// and the report is scoped to the active provider only, so it can be polled
/// freely by health/liveness tooling.
/// </summary>
public sealed class AiProviderHealthService : IAiProviderHealthService
{
    private readonly IAiProviderSelector _providerSelector;
    private readonly IAiDiagnostics _diagnostics;
    private readonly ILogger<AiProviderHealthService> _logger;

    public AiProviderHealthService(
        IAiProviderSelector providerSelector,
        IAiDiagnostics diagnostics,
        ILogger<AiProviderHealthService> logger)
    {
        _providerSelector = providerSelector ?? throw new ArgumentNullException(nameof(providerSelector));
        _diagnostics = diagnostics ?? throw new ArgumentNullException(nameof(diagnostics));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public AiProviderHealthReportDto GetReport()
    {
        var providerType = _providerSelector.ActiveProvider;
        var providerName = _providerSelector.Resolve().ProviderName;

        // Ask for the full retained window (the diagnostics ring self-bounds to
        // a fixed cap), then scope every metric to the active provider.
        var snapshot = _diagnostics.GetSnapshot(int.MaxValue);
        var entries = snapshot.RecentOperations
            .Where(e => e.Provider == providerType)
            .ToList();

        var successCount = entries.Count(e => e.IsSuccess);
        var failureCount = entries.Count - successCount;
        var total = entries.Count;

        var lastSuccess = entries
            .Where(e => e.IsSuccess)
            .OrderByDescending(e => e.Timestamp)
            .FirstOrDefault();

        var successRate = total > 0 ? successCount * 100d / total : 0d;
        var averageResponseTimeMs = total > 0 ? entries.Average(e => e.ResponseTimeMs) : 0d;

        _logger.LogInformation(
            "AI provider health: {ProviderName} — {TotalOperations} operation(s), " +
            "{SuccessCount} succeeded, {FailureCount} failed, " +
            "{SuccessRatePercent}% success, avg {AverageResponseTimeMs}ms.",
            providerName, total, successCount, failureCount,
            Math.Round(successRate, 2), Math.Round(averageResponseTimeMs, 2));

        return new AiProviderHealthReportDto
        {
            CurrentProvider = providerType,
            CurrentProviderName = providerName,
            LastSuccessfulRequestAt = lastSuccess?.Timestamp,
            FailureCount = failureCount,
            SuccessCount = successCount,
            TotalOperations = total,
            SuccessRatePercent = Math.Round(successRate, 2),
            AverageResponseTimeMs = Math.Round(averageResponseTimeMs, 2),
            GeneratedAt = DateTime.UtcNow,
        };
    }
}