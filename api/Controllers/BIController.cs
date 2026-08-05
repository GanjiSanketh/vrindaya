using Asp.Versioning;
using Microsoft.AspNetCore.Mvc;
using Vrindaya.Api.DTOs.Products;
using Vrindaya.Api.Interfaces;

namespace Vrindaya.Api.Controllers;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/[controller]")]
public class BIController : ControllerBase
{
    private readonly IBIService _biService;

    public BIController(IBIService biService)
    {
        _biService = biService;
    }

    [HttpGet]
    public async Task<ActionResult<BIDashboardDto>> GetBIDashboard(CancellationToken cancellationToken)
    {
        var dashboard = await _biService.GetBIDashboardAsync(cancellationToken);
        return Ok(dashboard);
    }
}