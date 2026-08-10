using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Vrindaya.Api.AI.Core.Interfaces;
using Vrindaya.Api.AI.Core.Models;
using Vrindaya.Api.Constants;

namespace Vrindaya.Api.Controllers;

/// <summary>
/// Health surface for the AI subsystem — a single route family under
/// <c>/api/v1/ai/health</c> with read-only endpoints:
/// <list type="bullet">
///   <item><c>GET /</c> — full AI health report (provider availability, active
///   provider, mock mode, rolling telemetry) produced by
///   <see cref="IAiHealthService"/>;</item>
///   <item><c>GET /status</c> — health report for the active provider (last
///   successful request, failure count, success rate, average response time),
///   produced by <see cref="IAiProviderHealthService"/>;</item>
///   <item><c>GET /live</c> — liveness probe (process alive, never fails on
///   external dependencies);</item>
///   <item><c>GET /ready</c> — readiness probe (200 when the active provider is
///   available, 503 otherwise);</item>
///   <item><c>GET /provider</c> — a live reachability probe against the active
///   provider implementation;</item>
///   <item><c>GET /metrics</c> — rolling telemetry over recent AI operations.</item>
/// </list>
///
/// Everything here delegates to existing services — no provider call is shaped
/// here, no state is mutated, and no secret is ever returned (the Gemini API key
/// never leaves configuration as anything but an absence/presence signal).
/// </summary>
[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/ai/health")]
[Produces("application/json")]
[Tags("AI Health")]
public class AiHealthController : ControllerBase
{
    private readonly IAiHealthService _healthService;
    private readonly IAiProviderHealthService _providerHealthService;
    private readonly IAiProviderSelector _providerSelector;
    private readonly IAiDiagnostics _diagnostics;
    private readonly ILogger<AiHealthController> _logger;

    /// <summary>Upper bound on how many recent operations a metrics call may return.</summary>
    private const int MaxRecentOperations = 100;

    public AiHealthController(
        IAiHealthService healthService,
        IAiProviderHealthService providerHealthService,
        IAiProviderSelector providerSelector,
        IAiDiagnostics diagnostics,
        ILogger<AiHealthController> logger)
    {
        _healthService = healthService ?? throw new ArgumentNullException(nameof(healthService));
        _providerHealthService = providerHealthService ?? throw new ArgumentNullException(nameof(providerHealthService));
        _providerSelector = providerSelector ?? throw new ArgumentNullException(nameof(providerSelector));
        _diagnostics = diagnostics ?? throw new ArgumentNullException(nameof(diagnostics));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    /// <summary>
    /// Full AI subsystem health report from <see cref="IAiHealthService"/>:
    /// provider availability, active provider, mock mode and rolling request
    /// telemetry (last success/failure, totals, success rate, average response
    /// time). Derived from in-memory telemetry and local configuration; no
    /// external provider call is made, so this endpoint is safe to poll.
    /// </summary>
    /// <response code="200">The AI subsystem health report.</response>
    /// <response code="401">The caller is not authenticated.</response>
    /// <response code="403">The caller is not an administrator.</response>
    [HttpGet]
    [Authorize(Policy = AppConstants.AdminOnlyPolicy)]
    [ProducesResponseType(typeof(AiHealthReportDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public ActionResult<AiHealthReportDto> GetHealth()
    {
        var report = _healthService.GetHealthReport();

        _logger.LogInformation(
            "AI health requested -- provider {Provider}, available {Available}, mock {MockMode}, {TotalRequests} request(s).",
            report.CurrentProviderName,
            report.IsProviderAvailable,
            report.IsMockModeEnabled,
            report.TotalRequests);

        return Ok(report);
    }

    /// <summary>
    /// Liveness probe. Confirms the AI health monitor and process are responsive.
    /// Always returns 200 once this endpoint is reached — liveness must never
    /// fail on an external dependency (e.g. a missing API key), since that would
    /// force application restarts on a transient provider outage rather than a
    /// genuine process failure.
    /// </summary>
    /// <response code="200">The AI subsystem is live.</response>
    /// <response code="401">The caller is not authenticated.</response>
    /// <response code="403">The caller is not an administrator.</response>
    [HttpGet("live")]
    [Authorize(Policy = AppConstants.AdminOnlyPolicy)]
    [ProducesResponseType(typeof(AiHealthReportDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public ActionResult<AiHealthReportDto> GetLive()
    {
        var report = _healthService.GetHealthReport();

        _logger.LogInformation(
            "AI liveness probe -- {Provider} available {Available}, {TotalRequests} request(s) recorded.",
            report.CurrentProviderName,
            report.IsProviderAvailable,
            report.TotalRequests);

        return Ok(report);
    }

    /// <summary>
    /// Readiness probe. Reports whether the AI subsystem is ready to serve
    /// requests: ready when the active provider is available and configured, not
    /// ready otherwise. Returns 503 (with the same report body) when the provider
    /// is unavailable so callers can gate traffic without a separate request.
    /// </summary>
    /// <response code="200">The AI subsystem is ready (provider available).</response>
    /// <response code="503">The AI subsystem is not ready (provider unavailable).</response>
    /// <response code="401">The caller is not authenticated.</response>
    /// <response code="403">The caller is not an administrator.</response>
    [HttpGet("ready")]
    [Authorize(Policy = AppConstants.AdminOnlyPolicy)]
    [ProducesResponseType(typeof(AiHealthReportDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(AiHealthReportDto), StatusCodes.Status503ServiceUnavailable)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public ActionResult<AiHealthReportDto> GetReady()
    {
        var report = _healthService.GetHealthReport();

        if (!report.IsProviderAvailable)
        {
            _logger.LogWarning(
                "AI readiness probe -- {Provider} is not available; reporting not ready.",
                report.CurrentProviderName);

            return StatusCode(StatusCodes.Status503ServiceUnavailable, report);
        }

        _logger.LogInformation(
            "AI readiness -- {Provider} available, {TotalRequests} request(s).",
            report.CurrentProviderName,
            report.TotalRequests);

        return Ok(report);
    }

    /// <summary>
    /// Returns a health report for the currently active AI provider: which
    /// provider it is, its last successful request, failure count, success rate
    /// and average response time. Safe to poll — derived from local telemetry,
    /// no external provider call is made.
    /// </summary>
    /// <response code="200">The active provider's health report.</response>
    [HttpGet("status")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(AiProviderHealthReportDto), StatusCodes.Status200OK)]
    public ActionResult<AiProviderHealthReportDto> GetStatus()
    {
        var report = _providerHealthService.GetReport();

        _logger.LogInformation(
            "AI health status requested — provider {Provider}, success rate {SuccessRate}%.",
            report.CurrentProviderName, report.SuccessRatePercent);

        return Ok(report);
    }

    /// <summary>
    /// Runs a live reachability probe against the currently active provider and
    /// returns its round-trip latency and health state. Unlike /status this
    /// contacts the provider implementation, so it is gated to administrators.
    /// </summary>
    /// <response code="200">The live provider probe result.</response>
    /// <response code="401">The caller is not authenticated.</response>
    /// <response code="403">The caller is not an administrator.</response>
    [HttpGet("provider")]
    [Authorize(Policy = AppConstants.AdminOnlyPolicy)]
    [ProducesResponseType(typeof(AiProviderHealthStatus), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<AiProviderHealthStatus>> GetProvider(CancellationToken cancellationToken)
    {
        var provider = _providerSelector.Resolve();
        var sw = System.Diagnostics.Stopwatch.StartNew();
        var status = await provider.HealthCheckAsync(cancellationToken);
        sw.Stop();

        _logger.LogInformation(
            "AI provider probe via {Provider} — healthy {IsHealthy}, response time {ResponseTimeMs}ms.",
            provider.ProviderName, status.IsHealthy, sw.ElapsedMilliseconds);

        return Ok(status);
    }

    /// <summary>
    /// Returns rolling telemetry over recent AI operations: response times,
    /// cache hit rate, success rate and token totals, plus the most recent
    /// entries. Process-local and bounded, so counts reset on restart; prompt
    /// text is never recorded — only a hash.
    /// </summary>
    /// <param name="recent">
    /// How many recent operations to include, newest first. Clamped to 1–100;
    /// defaults to 20.
    /// </param>
    /// <response code="200">The rolling diagnostics snapshot.</response>
    /// <response code="401">The caller is not authenticated.</response>
    /// <response code="403">The caller is not an administrator.</response>
    [HttpGet("metrics")]
    [Authorize(Policy = AppConstants.AdminOnlyPolicy)]
    [ProducesResponseType(typeof(AiDiagnosticsSnapshot), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public ActionResult<AiDiagnosticsSnapshot> GetMetrics([FromQuery] int recent = 20)
    {
        var take = Math.Clamp(recent, 1, MaxRecentOperations);
        var snapshot = _diagnostics.GetSnapshot(take);

        _logger.LogInformation(
            "AI health metrics requested — {TotalOperations} operation(s), " +
            "{SuccessRate}% success, {CacheHitRate}% cache hits.",
            snapshot.TotalOperations, snapshot.SuccessRatePercent, snapshot.CacheHitRatePercent);

        return Ok(snapshot);
    }
}