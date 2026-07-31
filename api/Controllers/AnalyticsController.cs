using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Vrindaya.Api.DTOs.Analytics;
using Vrindaya.Api.Interfaces;

namespace Vrindaya.Api.Controllers;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/[controller]")]
public class AnalyticsController : ControllerBase
{
    private readonly IAnalyticsService _analyticsService;

    public AnalyticsController(IAnalyticsService analyticsService)
    {
        _analyticsService = analyticsService;
    }

    /// <summary>Public, no auth — fired by anonymous storefront visitors clicking "Buy on Flipkart" (matches GetProducts/GetProductById's existing no-auth precedent). Explicit [AllowAnonymous] since the app-wide fallback policy now requires AdminOnly by default.</summary>
    [HttpPost("products/{id}/click")]
    [AllowAnonymous]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> RecordProductClick(string id, CancellationToken cancellationToken)
    {
        await _analyticsService.RecordProductClickAsync(id, cancellationToken);
        return NoContent();
    }

    /// <summary>Admin-only (fallback policy). Dashboard summary: all-time + today's detail/flipkart click totals and the tracked-product count.</summary>
    [HttpGet("overview")]
    [ProducesResponseType(typeof(AnalyticsOverviewResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetOverview(CancellationToken cancellationToken)
    {
        return Ok(await _analyticsService.GetOverviewAsync(cancellationToken));
    }

    /// <summary>Admin-only (fallback policy). Top products by `sort` (`detail` default | `flipkart`), limited to 1..100 rows.</summary>
    [HttpGet("top")]
    [ProducesResponseType(typeof(List<TopProductAnalyticsResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetTopProducts(
        [FromQuery] string sort = "detail",
        [FromQuery] int limit = 10,
        CancellationToken cancellationToken = default)
    {
        var clampedLimit = Math.Clamp(limit, 1, 100);
        return Ok(await _analyticsService.GetTopProductsAsync(sort, clampedLimit, cancellationToken));
    }

    /// <summary>Admin-only (fallback policy). Full per-product analytics — totals plus the daily breakdown, newest first.</summary>
    [HttpGet("products/{id}")]
    [ProducesResponseType(typeof(ProductAnalyticsDetailResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetProductAnalytics(string id, CancellationToken cancellationToken)
    {
        var result = await _analyticsService.GetProductAnalyticsAsync(id, cancellationToken);
        return result is null ? NotFound() : Ok(result);
    }
}
