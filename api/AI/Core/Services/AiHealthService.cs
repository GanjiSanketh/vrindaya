using Microsoft.Extensions.Logging;
using Vrindaya.Api.AI.Core.Configuration;
using Vrindaya.Api.AI.Core.Interfaces;
using Vrindaya.Api.AI.Core.Models;

namespace Vrindaya.Api.AI.Core.Services;

/// <summary>
/// Default <see cref="IAiHealthService"/>. Composes the live provider selection
/// (<see cref="IAiProviderSelector"/>) with the rolling telemetry already
/// collected by <see cref="IAiDiagnostics"/> and the local configuration surface
/// (<see cref="AiConfiguration"/>) into a single, in-memory health snapshot.
///
/// Everything here is derived from DI registrations and already-recorded
/// observations — no provider call is triggered, no state is mutated, and no
/// secret (e.g. the Gemini API key) is ever exposed. The report always reflects
/// the latest telemetry window and provider selection because it is computed on
/// demand.
///
/// Registered as a scoped service alongside the other core AI services, since
/// <see cref="IAiProviderSelector"/> is itself request-scoped.
/// </summary>
public sealed class AiHealthService : IAiHealthService
{
    private readonly IAiProviderSelector _providerSelector;
    private readonly IAiDiagnostics _diagnostics;
    private readonly AiConfiguration _configuration;
    private readonly ILogger<AiHealthService> _logger;

    public AiHealthService(
        IAiProviderSelector providerSelector,
        IAiDiagnostics diagnostics,
        AiConfiguration configuration,
        ILogger<AiHealthService> logger)
    {
        _providerSelector = providerSelector ?? throw new ArgumentNullException(nameof(providerSelector));
        _diagnostics = diagnostics ?? throw new ArgumentNullException(nameof(diagnostics));
        _configuration = configuration ?? throw new ArgumentNullException(nameof(configuration));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public AiHealthReportDto GetHealthReport()
    {
        var provider = _providerSelector.Resolve();
        var providerType = _providerSelector.ActiveProvider;

        // Provider availability is a configuration-derived signal: the mock
        // provider is always available (it has no external dependency); a real
        // provider is available only when its required credentials are present.
        // No network round-trip is made, so this stays a pure in-memory check.
        var isProviderAvailable = providerType switch
        {
            AiProviderType.Gemini => !string.IsNullOrWhiteSpace(_configuration.Gemini.ApiKey),
            _ => true,
        };

        var snapshot = _diagnostics.GetSnapshot(int.MaxValue);
        var recent = snapshot.RecentOperations;

        DateTime? lastSuccess = null;
        DateTime? lastFailure = null;

        // RecentOperations is yielded newest-first, so the first match of each
        // kind is the most recent of that kind.
        foreach (var entry in recent)
        {
            if (entry.IsSuccess && lastSuccess is null)
            {
                lastSuccess = entry.Timestamp;
            }
            else if (!entry.IsSuccess && lastFailure is null)
            {
                lastFailure = entry.Timestamp;
            }

            if (lastSuccess.HasValue && lastFailure.HasValue)
            {
                break;
            }
        }

        var report = new AiHealthReportDto
        {
            IsProviderAvailable = isProviderAvailable,
            CurrentProvider = providerType,
            CurrentProviderName = provider.ProviderName,
            IsMockModeEnabled = provider.IsMock,
            LastSuccessfulRequestAt = lastSuccess,
            LastFailedRequestAt = lastFailure,
            TotalRequests = snapshot.TotalOperations,
            TotalFailures = snapshot.FailureCount,
            SuccessRate = snapshot.SuccessRatePercent,
            AverageResponseTimeMs = snapshot.AverageResponseTimeMs,
        };

        _logger.LogInformation(
            "AI health report — provider {Provider} (available {Available}, mock {MockMode}), " +
            "{TotalRequests} request(s), {TotalFailures} failure(s), {SuccessRate}% success, " +
            "avg {AverageResponseTimeMs}ms.",
            provider.ProviderName,
            isProviderAvailable,
            provider.IsMock,
            report.TotalRequests,
            report.TotalFailures,
            Math.Round(report.SuccessRate, 2),
            Math.Round(report.AverageResponseTimeMs, 2));

        return report;
    }
}
