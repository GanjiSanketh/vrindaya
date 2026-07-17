using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Vrindaya.Api.Common;
using Vrindaya.Api.Constants;
using Vrindaya.Api.DTOs.Reports;
using Vrindaya.Api.Interfaces;

namespace Vrindaya.Api.Controllers;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/reports")]
[Authorize(Policy = AppConstants.AdminOnlyPolicy)]
public class ReportsController : ControllerBase
{
    private readonly IReportsService _reportsService;

    public ReportsController(IReportsService reportsService)
    {
        _reportsService = reportsService;
    }

    [HttpGet("inventory-valuation")]
    [ProducesResponseType(typeof(PagedResult<InventoryValuationRow>), StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedResult<InventoryValuationRow>>> GetInventoryValuation(
        [FromQuery] ReportQuery query, CancellationToken cancellationToken)
    {
        return Ok(await _reportsService.GetInventoryValuationAsync(query, cancellationToken));
    }

    [HttpGet("stock-summary")]
    [ProducesResponseType(typeof(PagedResult<StockSummaryRow>), StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedResult<StockSummaryRow>>> GetStockSummary(
        [FromQuery] ReportQuery query, CancellationToken cancellationToken)
    {
        return Ok(await _reportsService.GetStockSummaryAsync(query, cancellationToken));
    }

    [HttpGet("supplier")]
    [ProducesResponseType(typeof(PagedResult<SupplierReportRow>), StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedResult<SupplierReportRow>>> GetSupplierReport(
        [FromQuery] ReportQuery query, CancellationToken cancellationToken)
    {
        return Ok(await _reportsService.GetSupplierReportAsync(query, cancellationToken));
    }

    [HttpGet("purchase")]
    [ProducesResponseType(typeof(PagedResult<PurchaseReportRow>), StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedResult<PurchaseReportRow>>> GetPurchaseReport(
        [FromQuery] ReportQuery query, CancellationToken cancellationToken)
    {
        return Ok(await _reportsService.GetPurchaseReportAsync(query, cancellationToken));
    }

    [HttpGet("dead-stock")]
    [ProducesResponseType(typeof(PagedResult<DeadStockRow>), StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedResult<DeadStockRow>>> GetDeadStockReport(
        [FromQuery] ReportQuery query, CancellationToken cancellationToken)
    {
        return Ok(await _reportsService.GetDeadStockReportAsync(query, cancellationToken));
    }

    [HttpGet("low-stock")]
    [ProducesResponseType(typeof(PagedResult<LowStockReportRow>), StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedResult<LowStockReportRow>>> GetLowStockReport(
        [FromQuery] ReportQuery query, CancellationToken cancellationToken)
    {
        return Ok(await _reportsService.GetLowStockReportAsync(query, cancellationToken));
    }

    [HttpGet("movement")]
    [ProducesResponseType(typeof(PagedResult<MovementReportRow>), StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedResult<MovementReportRow>>> GetMovementReport(
        [FromQuery] ReportQuery query, CancellationToken cancellationToken)
    {
        return Ok(await _reportsService.GetMovementReportAsync(query, cancellationToken));
    }

    [HttpGet("{reportType}/export")]
    [ProducesResponseType(typeof(FileContentResult), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> ExportReport(
        string reportType, [FromQuery] ReportQuery query, CancellationToken cancellationToken,
        [FromQuery] string format = "csv")
    {
        var csv = await _reportsService.ExportCsvAsync(reportType, query, cancellationToken);
        var bytes = System.Text.Encoding.UTF8.GetPreamble().Concat(System.Text.Encoding.UTF8.GetBytes(csv)).ToArray();
        var filename = $"{reportType}-{DateTime.UtcNow:yyyy-MM-dd}.csv";
        return File(bytes, "text/csv; charset=utf-8", filename);
    }
}
