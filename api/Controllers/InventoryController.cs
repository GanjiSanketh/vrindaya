using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Vrindaya.Api.Common;
using Vrindaya.Api.Constants;
using Vrindaya.Api.DTOs.Inventory;
using Vrindaya.Api.Interfaces;

namespace Vrindaya.Api.Controllers;

/// <summary>
/// Inventory quantity management (stock/sizes/low-stock threshold/auto-hide)
/// and Product Lifecycle stage transitions — both admin-only, both narrow
/// partial writes against the same products collection ProductController
/// already owns. Composes IInventoryService + ILifecycleService directly
/// rather than going through IProductService, mirroring how
/// IProductStorageService is already called directly by ProductController
/// for the same "doesn't need the full product-editorial path" reason.
/// </summary>
[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/inventory")]
[Authorize(Policy = AppConstants.AdminOnlyPolicy)]
public class InventoryController : ControllerBase
{
    private readonly IInventoryService _inventoryService;
    private readonly ILifecycleService _lifecycleService;

    public InventoryController(IInventoryService inventoryService, ILifecycleService lifecycleService)
    {
        _inventoryService = inventoryService;
        _lifecycleService = lifecycleService;
    }

    [HttpGet("{productId}")]
    [ProducesResponseType(typeof(InventoryDetailResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<InventoryDetailResponse>> GetInventory(string productId, CancellationToken cancellationToken)
    {
        var response = await _inventoryService.GetInventoryAsync(productId, cancellationToken);
        return Ok(response);
    }

    [HttpPatch("{productId}")]
    [ProducesResponseType(typeof(InventoryDetailResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<InventoryDetailResponse>> UpdateInventory(string productId, [FromBody] UpdateInventoryRequest request, CancellationToken cancellationToken)
    {
        var updatedBy = User.FindFirstEmail();
        var response = await _inventoryService.UpdateInventoryAsync(productId, request, updatedBy, cancellationToken);
        return Ok(response);
    }

    [HttpPatch("{productId}/lifecycle")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateLifecycleStage(string productId, [FromBody] UpdateLifecycleStageRequest request, CancellationToken cancellationToken)
    {
        var updatedBy = User.FindFirstEmail();
        await _lifecycleService.UpdateStageAsync(productId, request.Stage, updatedBy, cancellationToken);
        return NoContent();
    }

    [HttpPatch("bulk-lifecycle")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> BulkUpdateLifecycleStage([FromBody] BulkLifecycleStageRequest request, CancellationToken cancellationToken)
    {
        var updatedBy = User.FindFirstEmail();
        await _lifecycleService.BulkUpdateStageAsync(request.Ids, request.Stage, updatedBy, cancellationToken);
        return NoContent();
    }
}
