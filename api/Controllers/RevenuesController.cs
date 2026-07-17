using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Vrindaya.Api.Common;
using Vrindaya.Api.Constants;
using Vrindaya.Api.DTOs.Revenues;
using Vrindaya.Api.Interfaces;

namespace Vrindaya.Api.Controllers;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/revenues")]
[Authorize(Policy = AppConstants.AdminOnlyPolicy)]
public class RevenuesController : ControllerBase
{
    private readonly IRevenueService _service;

    public RevenuesController(IRevenueService service)
    {
        _service = service;
    }

    [HttpGet]
    [ProducesResponseType(typeof(PagedResult<RevenueResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedResult<RevenueResponse>>> GetAll(
        [FromQuery] int pageSize, [FromQuery] string? cursor, [FromQuery] string? search,
        [FromQuery] string? source, [FromQuery] string? status,
        [FromQuery] DateTime? dateFrom, [FromQuery] DateTime? dateTo,
        CancellationToken cancellationToken)
    {
        return Ok(await _service.GetAllAsync(cursor, pageSize == 0 ? 20 : pageSize, search, source, status, dateFrom, dateTo, cancellationToken));
    }

    [HttpGet("{id}")]
    [ProducesResponseType(typeof(RevenueResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<RevenueResponse>> GetOne(string id, CancellationToken cancellationToken)
    {
        return Ok(await _service.GetAsync(id, cancellationToken));
    }

    [HttpPost]
    [ProducesResponseType(typeof(RevenueResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<RevenueResponse>> Create([FromBody] CreateRevenueRequest request, CancellationToken cancellationToken)
    {
        var createdBy = User.FindFirstEmail();
        var response = await _service.CreateAsync(request, createdBy, cancellationToken);
        return CreatedAtAction(nameof(GetOne), new { id = response.Id, version = "1.0" }, response);
    }

    [HttpPut("{id}")]
    [ProducesResponseType(typeof(RevenueResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<RevenueResponse>> Update(string id, [FromBody] UpdateRevenueRequest request, CancellationToken cancellationToken)
    {
        return Ok(await _service.UpdateAsync(id, request, cancellationToken));
    }

    [HttpDelete("{id}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(string id, CancellationToken cancellationToken)
    {
        await _service.DeleteAsync(id, cancellationToken);
        return NoContent();
    }

    [HttpGet("summary/monthly")]
    [ProducesResponseType(typeof(RevenueSummaryResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<RevenueSummaryResponse>> GetMonthlySummary(
        [FromQuery] int year, [FromQuery] int? month, CancellationToken cancellationToken)
    {
        return Ok(await _service.GetMonthlySummaryAsync(year, month, cancellationToken));
    }

    [HttpGet("summary/yearly")]
    [ProducesResponseType(typeof(RevenueSummaryResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<RevenueSummaryResponse>> GetYearlySummary(
        [FromQuery] int year, CancellationToken cancellationToken)
    {
        return Ok(await _service.GetYearlySummaryAsync(year, cancellationToken));
    }
}
