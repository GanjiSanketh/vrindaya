using Microsoft.Extensions.Logging;
using Vrindaya.Api.AI.Core.Configuration;
using Vrindaya.Api.AI.Core.Interfaces;
using Vrindaya.Api.AI.Core.Models;

namespace Vrindaya.Api.AI.Core.Services;

public sealed class AiDiagnosticsDashboardService : IAiDiagnosticsDashboardService
{
    private readonly IAiUsageService _usageService;
    private readonly IAiCostEstimator _costEstimator;
    private readonly IAiProviderHealthService _providerHealthService;
    private readonly IAiProviderSelector _providerSelector;
    private readonly AiConfiguration _configuration;
    private readonly ILogger<AiDiagnosticsDashboardService> _logger;

    public AiDiagnosticsDashboardService(
        IAiUsageService usageService,
        IAiCostEstimator costEstimator,
        IAiProviderHealthService providerHealthService,
        IAiProviderSelector providerSelector,
        AiConfiguration configuration,
        ILogger<AiDiagnosticsDashboardService> logger)
    {
        _usageService = usageService ?? throw new ArgumentNullException(nameof(usageService));
        _costEstimator = costEstimator ?? throw new ArgumentNullException(nameof(costEstimator));
        _providerHealthService = providerHealthService ?? throw new ArgumentNullException(nameof(providerHealthService));
        _providerSelector = providerSelector ?? throw new ArgumentNullException(nameof(providerSelector));
        _configuration = configuration ?? throw new ArgumentNullException(nameof(configuration));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public AiDiagnosticsSummary GetSummary()
    {
        var activeProvider = _providerSelector.ActiveProvider;
        var provider = _providerSelector.Resolve();
        var generationSettings = _configuration.ForProvider(activeProvider);

        var usageSummary = _usageService.GetSummary();
        var healthSummary = _providerHealthService.GetReport();

        var costSummary = _costEstimator.Estimate(
            activeProvider,
            generationSettings.Model,
            (int)usageSummary.TotalEstimatedTokens,
            0);

        var lastEntry = usageSummary.Recent.FirstOrDefault();

        var summary = new AiDiagnosticsSummary
        {
            Provider = activeProvider,
            ProviderName = provider.ProviderName,
            Model = generationSettings.Model,
            IsMockModeEnabled = provider.IsMock,
            UsageSummary = usageSummary,
            CostSummary = costSummary,
            HealthSummary = healthSummary,
            LastRequest = lastEntry?.Timestamp,
            LastResponseTimeMs = lastEntry?.ExecutionTimeMs ?? 0,
            SuccessRate = usageSummary.SuccessRatePercent,
            TotalPrompts = (int)usageSummary.TotalEstimatedTokens,
            TotalCompletions = 0,
            GeneratedAt = DateTime.UtcNow,
        };

        _logger.LogInformation(
            "AI diagnostics dashboard summary — provider {Provider} (mock {MockMode}), " +
            "{TotalRequests} request(s), {SuccessRate}% success.",
            provider.ProviderName,
            provider.IsMock,
            usageSummary.TotalRequests,
            Math.Round(usageSummary.SuccessRatePercent, 2));

        return summary;
    }
}
