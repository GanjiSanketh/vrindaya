using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Vrindaya.Api.Common;
using Vrindaya.Api.Constants;
using Vrindaya.Api.DTOs.Expenses;
using Vrindaya.Api.Interfaces;

namespace Vrindaya.Api.Controllers;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/expenses")]
[Authorize(Policy = AppConstants.AdminOnlyPolicy)]
public class ExpensesController : ControllerBase
{
    private readonly IExpenseService _service;

    public ExpensesController(IExpenseService service)
    {
        _service = service;
    }

    [HttpGet]
    [ProducesResponseType(typeof(PagedResult<ExpenseResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedResult<ExpenseResponse>>> GetAll(
        [FromQuery] int pageSize, [FromQuery] string? cursor, [FromQuery] string? search,
        [FromQuery] string? category, [FromQuery] DateTime? dateFrom, [FromQuery] DateTime? dateTo,
        CancellationToken cancellationToken)
    {
        return Ok(await _service.GetAllAsync(cursor, pageSize == 0 ? 20 : pageSize, search, category, dateFrom, dateTo, cancellationToken));
    }

    [HttpGet("{id}")]
    [ProducesResponseType(typeof(ExpenseResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ExpenseResponse>> GetOne(string id, CancellationToken cancellationToken)
    {
        return Ok(await _service.GetAsync(id, cancellationToken));
    }

    [HttpPost]
    [ProducesResponseType(typeof(ExpenseResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ExpenseResponse>> Create([FromBody] CreateExpenseRequest request, CancellationToken cancellationToken)
    {
        var createdBy = User.FindFirstEmail();
        var response = await _service.CreateAsync(request, createdBy, cancellationToken);
        return CreatedAtAction(nameof(GetOne), new { id = response.Id, version = "1.0" }, response);
    }

    [HttpPut("{id}")]
    [ProducesResponseType(typeof(ExpenseResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ExpenseResponse>> Update(string id, [FromBody] UpdateExpenseRequest request, CancellationToken cancellationToken)
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
    [ProducesResponseType(typeof(ExpenseSummaryResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<ExpenseSummaryResponse>> GetMonthlySummary(
        [FromQuery] int year, [FromQuery] int? month, CancellationToken cancellationToken)
    {
        return Ok(await _service.GetMonthlySummaryAsync(year, month, cancellationToken));
    }

    [HttpGet("summary/yearly")]
    [ProducesResponseType(typeof(ExpenseSummaryResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<ExpenseSummaryResponse>> GetYearlySummary(
        [FromQuery] int year, CancellationToken cancellationToken)
    {
        return Ok(await _service.GetYearlySummaryAsync(year, cancellationToken));
    }
}
