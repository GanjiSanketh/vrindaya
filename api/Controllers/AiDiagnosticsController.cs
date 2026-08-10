using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using Vrindaya.Api.AI.Core.Configuration;
using Vrindaya.Api.AI.Core.Interfaces;
using Vrindaya.Api.AI.Core.Models;
using Vrindaya.Api.AI.Core.Templates;
using Vrindaya.Api.AI.Orchestrator.Interfaces;
using Vrindaya.Api.Constants;

namespace Vrindaya.Api.Controllers;

/// <summary>
/// Read-only diagnostics for the AI subsystem.
///
/// Two endpoints, both returning diagnostics DTOs and nothing else:
/// <list type="bullet">
///   <item><c>GET /status</c> — how the AI subsystem is currently wired
///   (active provider, model, cache and retry configuration);</item>
///   <item><c>GET /metrics</c> — rolling telemetry over recent AI operations
///   (response time, cache hit rate, token totals, success/failure).</item>
/// </list>
///
/// Nothing here triggers an AI call, mutates state or reads business data, and
/// no secret is ever returned — the Gemini API key surfaces only as a boolean
/// presence flag. Admin-only, because the payload describes internal
/// configuration and operational behaviour.
/// </summary>
[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/ai/diagnostics")]
[Authorize(Policy = AppConstants.AdminOnlyPolicy)]
[Produces("application/json")]
[Tags("AI Diagnostics")]
public class AiDiagnosticsController : ControllerBase
{
    private readonly IAiProviderSelector _providerSelector;
    private readonly IAiDiagnostics _diagnostics;
    private readonly IAiDiagnosticsDashboardService _dashboardService;
    private readonly IAiHealthService _healthService;
    private readonly IPromptTemplateService _promptTemplateService;
    private readonly IEnumerable<IAiModule> _modules;
    private readonly IOptions<GeminiSettings> _geminiSettings;
    private readonly IOptions<AiCacheOptions> _cacheOptions;
    private readonly ILogger<AiDiagnosticsController> _logger;

    /// <summary>Upper bound on how many recent operations a metrics call may return.</summary>
    private const int MaxRecentOperations = 100;

    public AiDiagnosticsController(
        IAiProviderSelector providerSelector,
        IAiDiagnostics diagnostics,
        IAiDiagnosticsDashboardService dashboardService,
        IAiHealthService healthService,
        IPromptTemplateService promptTemplateService,
        IEnumerable<IAiModule> modules,
        IOptions<GeminiSettings> geminiSettings,
        IOptions<AiCacheOptions> cacheOptions,
        ILogger<AiDiagnosticsController> logger)
    {
        _providerSelector = providerSelector ?? throw new ArgumentNullException(nameof(providerSelector));
        _diagnostics = diagnostics ?? throw new ArgumentNullException(nameof(diagnostics));
        _dashboardService = dashboardService ?? throw new ArgumentNullException(nameof(dashboardService));
        _healthService = healthService ?? throw new ArgumentNullException(nameof(healthService));
        _promptTemplateService = promptTemplateService ?? throw new ArgumentNullException(nameof(promptTemplateService));
        _modules = modules ?? throw new ArgumentNullException(nameof(modules));
        _geminiSettings = geminiSettings ?? throw new ArgumentNullException(nameof(geminiSettings));
        _cacheOptions = cacheOptions ?? throw new ArgumentNullException(nameof(cacheOptions));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    /// <summary>
    /// Returns a comprehensive overview of the AI subsystem diagnostics.
    /// </summary>
    /// <remarks>
    /// Aggregates provider, model, prompt template count, registered modules,
    /// health status, configuration validity, pricing, usage and cost into a
    /// single response. Read-only — no AI call is triggered.
    /// </remarks>
    /// <response code="200">The AI diagnostics overview.</response>
    /// <response code="401">The caller is not authenticated.</response>
    /// <response code="403">The caller is not an administrator.</response>
    [HttpGet]
    [ProducesResponseType(typeof(AiDiagnosticsOverviewDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public ActionResult<AiDiagnosticsOverviewDto> GetOverview()
    {
        var gemini = _geminiSettings.Value;
        var provider = _providerSelector.Resolve();
        var activeProvider = _providerSelector.ActiveProvider;
        var health = _healthService.GetHealthReport();
        var templates = _promptTemplateService.GetAll();
        var modules = _modules.ToList();
        var dashboard = _dashboardService.GetSummary();

        var overview = new AiDiagnosticsOverviewDto
        {
            Provider = provider.ProviderName,
            Model = gemini.Model,
            PromptTemplateCount = templates.Count,
            RegisteredModules = modules.Select(m => m.Name).ToList(),
            IsHealthy = health.IsProviderAvailable,
            IsConfigurationValid = !string.IsNullOrWhiteSpace(gemini.Model) && gemini.MaxOutputTokens > 0,
            IsPricingLoaded = gemini.InputTokenPricePerMillion >= 0 && gemini.OutputTokenPricePerMillion >= 0,
            Usage = dashboard.UsageSummary,
            Cost = dashboard.CostSummary,
        };

        _logger.LogInformation(
            "AI diagnostics overview requested — provider {Provider}, {TemplateCount} template(s), {ModuleCount} module(s).",
            provider.ProviderName, templates.Count, modules.Count);

        return Ok(overview);
    }

    /// <summary>
    /// Returns how the AI subsystem is currently configured.
    /// </summary>
    /// <remarks>
    /// Reports the configured versus active provider (they differ when a
    /// fallback applied), the target model, whether credentials are present,
    /// and the live cache and retry settings. Purely local — no provider call
    /// is made, so this endpoint is safe to poll.
    /// </remarks>
    /// <response code="200">The current AI subsystem status.</response>
    /// <response code="401">The caller is not authenticated.</response>
    /// <response code="403">The caller is not an administrator.</response>
    [HttpGet("status")]
    [ProducesResponseType(typeof(AiDiagnosticsStatusDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public ActionResult<AiDiagnosticsStatusDto> GetStatus()
    {
        var gemini = _geminiSettings.Value;
        var cache = _cacheOptions.Value;

        var activeProvider = _providerSelector.Resolve();
        var configured = _providerSelector.ConfiguredProvider;
        var active = _providerSelector.ActiveProvider;

        _logger.LogInformation(
            "AI diagnostics status requested — active provider {Provider}, model {Model}.",
            activeProvider.ProviderName, gemini.Model);

        return Ok(new AiDiagnosticsStatusDto
        {
            ConfiguredProvider = configured,
            ActiveProvider = active,
            ActiveProviderName = activeProvider.ProviderName,
            IsMock = activeProvider.IsMock,
            Model = gemini.Model,
            IsProviderConfigured = !string.IsNullOrWhiteSpace(gemini.ApiKey),
            FallbackApplied = configured != active,
            Cache = new AiCacheStatusDto
            {
                Enabled = cache.Enabled,
                AbsoluteExpirationMinutes = cache.AbsoluteExpirationMinutes,
                SlidingExpirationMinutes = cache.SlidingExpirationMinutes,
                CacheMockResponses = cache.CacheMockResponses,
            },
            Resilience = new AiResilienceStatusDto
            {
                TimeoutSeconds = gemini.EffectiveTimeoutSeconds,
                MaxRetryAttempts = gemini.MaxRetryAttempts,
                RetryBaseDelayMs = gemini.RetryBaseDelayMs,
                RetryMaxDelayMs = gemini.RetryMaxDelayMs,
                OverallTimeoutSeconds = gemini.OverallTimeout.TotalSeconds,
            },
            Version = AppConstants.ApplicationVersion,
        });
    }

    /// <summary>
    /// Returns a dashboard-oriented rollup of the AI subsystem diagnostics.
    /// </summary>
    /// <remarks>
    /// Aggregates the active provider/model, mock mode and a snapshot each of
    /// usage, cost and health into a single summary. Process-local and bounded:
    /// every figure derives from in-memory telemetry, so counts reset when the
    /// application restarts. No secret is ever included.
    /// </remarks>
    /// <response code="200">The AI diagnostics dashboard summary.</response>
    /// <response code="401">The caller is not authenticated.</response>
    /// <response code="403">The caller is not an administrator.</response>
    [HttpGet("dashboard")]
    [ProducesResponseType(typeof(AiDiagnosticsSummary), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public ActionResult<AiDiagnosticsSummary> GetDashboard()
    {
        var summary = _dashboardService.GetSummary();

        _logger.LogInformation(
            "AI diagnostics dashboard requested — provider {Provider}, {TotalRequests} request(s), {SuccessRate}% success.",
            summary.ProviderName, summary.UsageSummary.TotalRequests, summary.SuccessRate);

        return Ok(summary);
    }

    /// <summary>
    /// Returns rolling telemetry over recent AI operations.
    /// </summary>
    /// <remarks>
    /// Aggregates response times, cache hit rate, success rate and token totals
    /// across the operations retained in memory, along with the most recent
    /// entries. Telemetry is process-local and bounded, so counts reset when the
    /// application restarts. Prompt text is never recorded — only a hash.
    /// </remarks>
    /// <param name="recent">
    /// How many recent operations to include, newest first. Clamped to 1–100;
    /// defaults to 20.
    /// </param>
    /// <response code="200">The rolling diagnostics snapshot.</response>
    /// <response code="401">The caller is not authenticated.</response>
    /// <response code="403">The caller is not an administrator.</response>
    [HttpGet("metrics")]
    [ProducesResponseType(typeof(AiDiagnosticsSnapshot), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public ActionResult<AiDiagnosticsSnapshot> GetMetrics([FromQuery] int recent = 20)
    {
        var take = Math.Clamp(recent, 1, MaxRecentOperations);
        var snapshot = _diagnostics.GetSnapshot(take);

        _logger.LogInformation(
            "AI diagnostics metrics requested — {TotalOperations} operation(s) recorded, " +
            "{SuccessRate}% success, {CacheHitRate}% cache hits.",
            snapshot.TotalOperations, snapshot.SuccessRatePercent, snapshot.CacheHitRatePercent);

        return Ok(snapshot);
    }
}
