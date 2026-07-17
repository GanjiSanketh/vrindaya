using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Vrindaya.Api.Constants;
using Vrindaya.Api.DTOs.Settlement;
using Vrindaya.Api.Interfaces;

namespace Vrindaya.Api.Controllers;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/settlement-reconciliation")]
[Authorize(Policy = AppConstants.AdminOnlyPolicy)]
public class SettlementReconciliationController : ControllerBase
{
    private readonly ISettlementReconciliationService _service;

    public SettlementReconciliationController(ISettlementReconciliationService service)
    {
        _service = service;
    }

    [HttpGet]
    [ProducesResponseType(typeof(SettlementReconciliationResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<SettlementReconciliationResponse>> GetReconciliation(
        [FromQuery] string? source, [FromQuery] string? type,
        [FromQuery] int? year, [FromQuery] int? month, CancellationToken cancellationToken)
    {
        var currentYear = DateTime.UtcNow.Year;
        return Ok(await _service.GetReconciliationAsync(source, type, year ?? currentYear, month, cancellationToken));
    }
}
