using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Vrindaya.Api.Constants;
using Vrindaya.Api.DTOs.CashFlow;
using Vrindaya.Api.Interfaces;

namespace Vrindaya.Api.Controllers;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/cash-flow")]
[Authorize(Policy = AppConstants.AdminOnlyPolicy)]
public class CashFlowController : ControllerBase
{
    private readonly ICashFlowService _service;

    public CashFlowController(ICashFlowService service)
    {
        _service = service;
    }

    [HttpGet("dashboard")]
    [ProducesResponseType(typeof(CashFlowDashboardResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<CashFlowDashboardResponse>> GetDashboard(
        [FromQuery] int year, [FromQuery] int? month, CancellationToken cancellationToken)
    {
        var currentYear = DateTime.UtcNow.Year;
        return Ok(await _service.GetDashboardAsync(year == 0 ? currentYear : year, month, cancellationToken));
    }
}
