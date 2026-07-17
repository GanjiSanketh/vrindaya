using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Vrindaya.Api.Common;
using Vrindaya.Api.Constants;
using Vrindaya.Api.DTOs.InventoryManagement;
using Vrindaya.Api.DTOs.Suppliers;
using Vrindaya.Api.Interfaces;

namespace Vrindaya.Api.Controllers;

/// <summary>Supplier Management — admin-only throughout, no public surface.</summary>
[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/suppliers")]
[Authorize(Policy = AppConstants.AdminOnlyPolicy)]
public class SuppliersController : ControllerBase
{
    private readonly ISupplierService _service;

    public SuppliersController(ISupplierService service)
    {
        _service = service;
    }

    [HttpGet]
    [ProducesResponseType(typeof(PagedResult<SupplierResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedResult<SupplierResponse>>> GetAll(
        [FromQuery] int pageSize, [FromQuery] string? cursor, [FromQuery] string? search,
        [FromQuery] bool? activeOnly, [FromQuery] string? sortBy, [FromQuery] bool sortDescending,
        CancellationToken cancellationToken)
    {
        var response = await _service.GetAllAsync(
            cursor, pageSize == 0 ? 20 : pageSize, search, activeOnly, sortBy ?? "companyName", sortDescending, cancellationToken);
        return Ok(response);
    }

    [HttpGet("{id}")]
    [ProducesResponseType(typeof(SupplierResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<SupplierResponse>> GetOne(string id, CancellationToken cancellationToken)
    {
        return Ok(await _service.GetAsync(id, cancellationToken));
    }

    [HttpPost]
    [ProducesResponseType(typeof(SupplierResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<SupplierResponse>> Create([FromBody] CreateSupplierRequest request, CancellationToken cancellationToken)
    {
        var response = await _service.CreateAsync(request, cancellationToken);
        return CreatedAtAction(nameof(GetOne), new { id = response.Id, version = "1.0" }, response);
    }

    [HttpPut("{id}")]
    [ProducesResponseType(typeof(SupplierResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<SupplierResponse>> Update(string id, [FromBody] UpdateSupplierRequest request, CancellationToken cancellationToken)
    {
        return Ok(await _service.UpdateAsync(id, request, cancellationToken));
    }

    [HttpPatch("{id}/activate")]
    [ProducesResponseType(typeof(SupplierResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<SupplierResponse>> Activate(string id, CancellationToken cancellationToken)
    {
        return Ok(await _service.ActivateAsync(id, cancellationToken));
    }

    [HttpPatch("{id}/deactivate")]
    [ProducesResponseType(typeof(SupplierResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<SupplierResponse>> Deactivate(string id, CancellationToken cancellationToken)
    {
        return Ok(await _service.DeactivateAsync(id, cancellationToken));
    }

    [HttpGet("{id}/stats")]
    [ProducesResponseType(typeof(SupplierStatsResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<SupplierStatsResponse>> GetStats(string id, CancellationToken cancellationToken)
    {
        return Ok(await _service.GetStatsAsync(id, cancellationToken));
    }

    [HttpGet("{id}/purchase-history")]
    [ProducesResponseType(typeof(PagedResult<PurchaseEntryResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PagedResult<PurchaseEntryResponse>>> GetPurchaseHistory(
        string id, [FromQuery] int pageSize, [FromQuery] string? cursor, CancellationToken cancellationToken)
    {
        var response = await _service.GetPurchaseHistoryAsync(id, cursor, pageSize == 0 ? 20 : pageSize, cancellationToken);
        return Ok(response);
    }
}
