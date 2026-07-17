using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Vrindaya.Api.Common;
using Vrindaya.Api.Constants;
using Vrindaya.Api.DTOs.Profitability;
using Vrindaya.Api.Interfaces;

namespace Vrindaya.Api.Controllers;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/profitability")]
[Authorize(Policy = AppConstants.AdminOnlyPolicy)]
public class ProfitabilityController : ControllerBase
{
    private readonly IProfitabilityService _service;

    public ProfitabilityController(IProfitabilityService service)
    {
        _service = service;
    }

    [HttpGet]
    [ProducesResponseType(typeof(PagedResult<ProductProfitabilityResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedResult<ProductProfitabilityResponse>>> GetProfitability(
        [FromQuery] ProfitabilityQuery query, CancellationToken cancellationToken)
    {
        return Ok(await _service.GetProfitabilityAsync(query, cancellationToken));
    }
}
