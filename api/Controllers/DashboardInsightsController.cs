using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Vrindaya.Api.AI.Dashboard.DTOs;
using Vrindaya.Api.AI.Dashboard.Interfaces;

namespace Vrindaya.Api.Controllers;

/// <summary>
/// Exposes the aggregated business dashboard — product intelligence, the
/// recommendation engine, the campaign engine, Flipkart listing quality and
/// inventory status rolled into one view. The catalog projection is built by
/// the <see cref="IDashboardInsightSource"/> and aggregated by the
/// <see cref="IDashboardInsightService"/>; this controller holds no logic.
/// </summary>
[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/dashboard/insights")]
[Produces("application/json")]
[AllowAnonymous]
public class DashboardInsightsController : ControllerBase
{
    /// <summary>Default number of items returned inside each insight section.</summary>
    private const int DefaultSectionSize = 5;

    /// <summary>Upper bound accepted for the section size.</summary>
    private const int MaxSectionSize = 25;

    private readonly IDashboardInsightSource _insightSource;
    private readonly IDashboardInsightService _insightService;
    private readonly ILogger<DashboardInsightsController> _logger;

    public DashboardInsightsController(
        IDashboardInsightSource insightSource,
        IDashboardInsightService insightService,
        ILogger<DashboardInsightsController> logger)
    {
        _insightSource = insightSource ?? throw new ArgumentNullException(nameof(insightSource));
        _insightService = insightService ?? throw new ArgumentNullException(nameof(insightService));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    /// <summary>
    /// Returns the aggregated business insights for the active catalog. Every
    /// section is produced by an existing AI module — deterministic, with no
    /// external AI calls.
    /// </summary>
    /// <param name="limit">Items returned per insight section (1-25, default 5).</param>
    /// <param name="cancellationToken">Optional cancellation token.</param>
    /// <returns>A <see cref="DashboardInsightsDto"/> with every module section populated.</returns>
    [HttpGet("")]
    [ProducesResponseType(typeof(DashboardInsightsDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<DashboardInsightsDto>> Get(
        [FromQuery] int limit = DefaultSectionSize,
        CancellationToken cancellationToken = default)
    {
        if (limit < 1 || limit > MaxSectionSize)
            return BadRequest($"limit must be between 1 and {MaxSectionSize}.");

        cancellationToken.ThrowIfCancellationRequested();

        var request = await _insightSource.BuildRequestAsync(limit, cancellationToken);
        var insights = await _insightService.GetInsightsAsync(request, cancellationToken);

        _logger.LogInformation(
            "DashboardInsightsController: returned insights for {ProductCount} products (health {Health}/100).",
            insights.Summary.TotalProductsAnalyzed,
            insights.Summary.HealthScore);

        return Ok(insights);
    }
}
