using Asp.Versioning;
using Microsoft.AspNetCore.Mvc;
using Vrindaya.Api.DTOs.Products;
using Vrindaya.Api.Interfaces;

namespace Vrindaya.Api.Controllers;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/pricing")]
public class PricingController : ControllerBase
{
    private readonly IPricingService _pricingService;

    public PricingController(IPricingService pricingService)
    {
        _pricingService = pricingService;
    }

    [HttpGet("dashboard")]
    public async Task<ActionResult<PricingDashboardResponse>> GetDashboard(CancellationToken cancellationToken)
    {
        var dashboard = await _pricingService.GetDashboardAsync(cancellationToken);
        return Ok(dashboard);
    }
}
