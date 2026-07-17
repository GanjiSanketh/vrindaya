using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Vrindaya.Api.Common;
using Vrindaya.Api.Constants;
using Vrindaya.Api.DTOs.Forecasting;
using Vrindaya.Api.Interfaces;

namespace Vrindaya.Api.Controllers;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/inventory-forecast")]
[Authorize(Policy = AppConstants.AdminOnlyPolicy)]
public class InventoryForecastController : ControllerBase
{
    private readonly IInventoryForecastService _service;

    public InventoryForecastController(IInventoryForecastService service)
    {
        _service = service;
    }

    [HttpGet]
    [ProducesResponseType(typeof(PagedResult<InventoryForecastResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedResult<InventoryForecastResponse>>> GetForecast(
        [FromQuery] ForecastQuery query, CancellationToken cancellationToken)
    {
        return Ok(await _service.GetForecastAsync(query, cancellationToken));
    }
}
