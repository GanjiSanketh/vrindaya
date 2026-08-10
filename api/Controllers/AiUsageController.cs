using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Vrindaya.Api.AI.Core.Interfaces;
using Vrindaya.Api.AI.Core.Models;
using Vrindaya.Api.Constants;

namespace Vrindaya.Api.Controllers;

/// <summary>
/// Read-only usage surface for the AI subsystem, exposed under
/// <c>/api/v1/ai/usage</c>:
/// <list type="bullet">
///   <item><c>GET /summary</c> — rolling aggregate over recent AI requests
///   (total requests, success/failure counts and rate, average/max execution
///   time, total estimated tokens, per-provider and per-module breakdowns);</item>
///   <item><c>GET /recent</c> — the most recent individual usage entries.</item>
/// </list>
///
/// Everything here delegates to <see cref="IAiUsageService"/> — no provider is
/// called, no state is mutated, and no secret or request text is ever returned.
/// Telemetry is process-local and bounded, so counts reset on restart.
/// </summary>
[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/ai/usage")]
[Authorize(Policy = AppConstants.AdminOnlyPolicy)]
[Produces("application/json")]
[Tags("AI Usage")]
public class AiUsageController : ControllerBase
{
    private readonly IAiUsageService _usageService;
    private readonly ILogger<AiUsageController> _logger;

    /// <summary>Upper bound on how many recent entries a call may return.</summary>
    private const int MaxRecentEntries = 100;

    public AiUsageController(
        IAiUsageService usageService,
        ILogger<AiUsageController> logger)
    {
        _usageService = usageService ?? throw new ArgumentNullException(nameof(usageService));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    /// <summary>
    /// Returns a rolling aggregate over the AI usage entries recorded so far:
    /// total requests, success/failure counts and rate, average/max execution
    /// time, total estimated tokens, and per-provider / per-module breakdowns,
    /// along with the most recent entries.
    /// </summary>
    /// <remarks>
    /// Process-local and bounded — counts reset when the application restarts.
    /// Prompt text is never recorded, only a content-derived signature.
    /// </remarks>
    /// <param name="recent">
    /// How many recent entries to include in the summary, newest first. Clamped
    /// to 1–100; defaults to 20.
    /// </param>
    /// <response code="200">The rolling usage summary.</response>
    /// <response code="401">The caller is not authenticated.</response>
    /// <response code="403">The caller is not an administrator.</response>
    [HttpGet("summary")]
    [ProducesResponseType(typeof(AiUsageSummary), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public ActionResult<AiUsageSummary> GetSummary([FromQuery] int recent = 20)
    {
        var take = Math.Clamp(recent, 1, MaxRecentEntries);
        var summary = _usageService.GetSummary(take);

        _logger.LogInformation(
            "AI usage summary requested — {TotalRequests} request(s), {SuccessRate}% success, {TotalTokens} estimated tokens.",
            summary.TotalRequests, summary.SuccessRatePercent, summary.TotalEstimatedTokens);

        return Ok(summary);
    }

    /// <summary>
    /// Returns the most recent individual AI usage entries, newest first.
    /// </summary>
    /// <param name="recent">
    /// How many entries to return. Clamped to 1–100; defaults to 20.
    /// </param>
    /// <response code="200">The recent usage entries.</response>
    /// <response code="401">The caller is not authenticated.</response>
    /// <response code="403">The caller is not an administrator.</response>
    [HttpGet("recent")]
    [ProducesResponseType(typeof(List<AiUsageEntry>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public ActionResult<List<AiUsageEntry>> GetRecent([FromQuery] int recent = 20)
    {
        var take = Math.Clamp(recent, 1, MaxRecentEntries);
        var summary = _usageService.GetSummary(take);

        _logger.LogInformation(
            "AI usage recent entries requested — {TotalRequests} total recorded, returning {Returned}.",
            summary.TotalRequests, summary.Recent.Count);

        return Ok(summary.Recent.ToList());
    }
}
