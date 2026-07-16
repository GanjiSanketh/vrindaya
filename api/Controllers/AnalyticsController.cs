using Asp.Versioning;
using Microsoft.AspNetCore.Mvc;
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

    /// <summary>Public, no auth — fired by anonymous storefront visitors clicking "Buy on Flipkart" (matches GetProducts/GetProductById's existing no-auth precedent).</summary>
    [HttpPost("products/{id}/click")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> RecordProductClick(string id, CancellationToken cancellationToken)
    {
        await _analyticsService.RecordProductClickAsync(id, cancellationToken);
        return NoContent();
    }
}
