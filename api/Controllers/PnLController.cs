using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Vrindaya.Api.Constants;
using Vrindaya.Api.DTOs.ProfitLoss;
using Vrindaya.Api.Interfaces;

namespace Vrindaya.Api.Controllers;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/pnl")]
[Authorize(Policy = AppConstants.AdminOnlyPolicy)]
public class PnLController : ControllerBase
{
    private readonly IPnLService _service;

    public PnLController(IPnLService service)
    {
        _service = service;
    }

    [HttpGet("dashboard")]
    [ProducesResponseType(typeof(PnLDashboardResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<PnLDashboardResponse>> GetDashboard(
        [FromQuery] int year, [FromQuery] int? month, CancellationToken cancellationToken)
    {
        var currentYear = DateTime.UtcNow.Year;
        return Ok(await _service.GetDashboardAsync(year == 0 ? currentYear : year, month, cancellationToken));
    }
}
