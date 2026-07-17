using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Vrindaya.Api.Common;
using Vrindaya.Api.Constants;
using Vrindaya.Api.DTOs.InventoryManagement;
using Vrindaya.Api.Interfaces;

namespace Vrindaya.Api.Controllers;

/// <summary>
/// The Inventory Management module — dedicated inventory/inventoryVariants/
/// purchaseEntries/purchaseItems/stockMovements Firestore collections,
/// entirely separate from InventoryController (api/v1/inventory), which
/// still owns ProductDocument's embedded Sizes[].Stock fields untouched.
/// Admin-only throughout; no public surface, so no [AllowAnonymous]
/// appears anywhere in this controller.
///
/// Stock AND pricing (the Pricing Engine) both live on `variants` routes,
/// keyed by a variant id (one per Product+Color+Size) — see
/// InventoryVariantRepository.ComputeVariantId and
/// InventoryVariantDocument's doc comment for why pricing strategy moved
/// from the product level down to the variant level.
/// </summary>
[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/inventory-management")]
[Authorize(Policy = AppConstants.AdminOnlyPolicy)]
public class InventoryManagementController : ControllerBase
{
    private readonly IInventoryManagementService _service;

    public InventoryManagementController(IInventoryManagementService service)
    {
        _service = service;
    }

    [HttpGet("dashboard")]
    [ProducesResponseType(typeof(InventoryDashboardResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<InventoryDashboardResponse>> GetDashboard(
        [FromQuery] string? category, [FromQuery] string? supplierId, [FromQuery] string? collectionId,
        [FromQuery] DateTime? dateFrom, [FromQuery] DateTime? dateTo, CancellationToken cancellationToken)
    {
        var query = new InventoryDashboardQuery(category, supplierId, collectionId, dateFrom, dateTo);
        return Ok(await _service.GetDashboardAsync(query, cancellationToken));
    }

    [HttpGet("movements")]
    [ProducesResponseType(typeof(PagedResult<StockMovementResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedResult<StockMovementResponse>>> GetMovements(
        [FromQuery] int pageSize, [FromQuery] string? cursor,
        [FromQuery] string? productId, [FromQuery] string? movementType, [FromQuery] string? search,
        [FromQuery] DateTime? dateFrom, [FromQuery] DateTime? dateTo,
        CancellationToken cancellationToken)
    {
        var response = await _service.GetMovementsAsync(cursor, pageSize == 0 ? 20 : pageSize, productId, movementType, search, dateFrom, dateTo, cancellationToken);
        return Ok(response);
    }

    // ── Variant inventory (per Product+Color+Size) — includes the Pricing Engine ─

    [HttpGet("variants")]
    [ProducesResponseType(typeof(PagedResult<InventoryVariantResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedResult<InventoryVariantResponse>>> GetAllVariants(
        [FromQuery] int pageSize, [FromQuery] string? cursor, CancellationToken cancellationToken)
    {
        var response = await _service.GetAllVariantsAsync(cursor, pageSize == 0 ? 20 : pageSize, cancellationToken);
        return Ok(response);
    }

    [HttpGet("variants/low-stock")]
    [ProducesResponseType(typeof(List<InventoryVariantResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<List<InventoryVariantResponse>>> GetLowStockVariants(CancellationToken cancellationToken)
    {
        return Ok(await _service.GetLowStockVariantsAsync(cancellationToken));
    }

    [HttpGet("variants/status/{status}")]
    [ProducesResponseType(typeof(List<InventoryVariantResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<List<InventoryVariantResponse>>> GetVariantsByStatus(string status, CancellationToken cancellationToken)
    {
        return Ok(await _service.GetVariantsByStatusAsync(status, cancellationToken));
    }

    [HttpPatch("variants/thresholds")]
    [ProducesResponseType(typeof(List<InventoryVariantResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<List<InventoryVariantResponse>>> BulkUpdateStockThresholds(
        [FromBody] BulkUpdateStockThresholdsRequest request, CancellationToken cancellationToken)
    {
        return Ok(await _service.BulkUpdateStockThresholdsAsync(request, User.FindFirstEmail(), cancellationToken));
    }

    [HttpGet("variants/{variantId}")]
    [ProducesResponseType(typeof(InventoryVariantResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<InventoryVariantResponse>> GetVariant(string variantId, CancellationToken cancellationToken)
    {
        return Ok(await _service.GetVariantAsync(variantId, cancellationToken));
    }

    [HttpPatch("variants/{variantId}/movements")]
    [ProducesResponseType(typeof(InventoryVariantResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<InventoryVariantResponse>> RecordMovement(
        string variantId, [FromBody] RecordStockMovementRequest request, CancellationToken cancellationToken)
    {
        var actorEmail = User.FindFirstEmail();
        return Ok(await _service.RecordMovementAsync(variantId, request, actorEmail, cancellationToken));
    }

    [HttpGet("products/{productId}/variants")]
    [ProducesResponseType(typeof(List<InventoryVariantResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<List<InventoryVariantResponse>>> GetVariantsByProduct(string productId, CancellationToken cancellationToken)
    {
        return Ok(await _service.GetVariantsByProductAsync(productId, cancellationToken));
    }

    [HttpPut("products/{productId}/variants")]
    [ProducesResponseType(typeof(InventoryVariantResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<InventoryVariantResponse>> UpsertVariant(
        string productId, [FromBody] UpsertInventoryVariantRequest request, CancellationToken cancellationToken)
    {
        var updatedBy = User.FindFirstEmail();
        var isSuperAdmin = User.IsSuperAdmin();
        return Ok(await _service.UpsertVariantAsync(productId, request, updatedBy, isSuperAdmin, cancellationToken));
    }

    // ── Purchase Register ──────────────────────────────────────────────────

    [HttpPost("purchase-entries")]
    [ProducesResponseType(typeof(PurchaseEntryResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<PurchaseEntryResponse>> CreatePurchaseEntry(
        [FromBody] CreatePurchaseEntryRequest request, CancellationToken cancellationToken)
    {
        var createdBy = User.FindFirstEmail();
        var response = await _service.CreatePurchaseAsync(request, createdBy, cancellationToken);
        return CreatedAtAction(nameof(GetPurchaseEntry), new { id = response.Id, version = "1.0" }, response);
    }

    [HttpPut("purchase-entries/{id}")]
    [ProducesResponseType(typeof(PurchaseEntryResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PurchaseEntryResponse>> UpdatePurchaseEntry(
        string id, [FromBody] UpdatePurchaseEntryRequest request, CancellationToken cancellationToken)
    {
        var updatedBy = User.FindFirstEmail();
        return Ok(await _service.UpdatePurchaseAsync(id, request, updatedBy, cancellationToken));
    }

    [HttpGet("purchase-entries")]
    [ProducesResponseType(typeof(PagedResult<PurchaseEntryResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedResult<PurchaseEntryResponse>>> GetPurchaseEntries(
        [FromQuery] int pageSize, [FromQuery] string? cursor, CancellationToken cancellationToken)
    {
        var response = await _service.GetPurchaseEntriesAsync(cursor, pageSize == 0 ? 20 : pageSize, cancellationToken);
        return Ok(response);
    }

    [HttpGet("purchase-entries/{id}")]
    [ProducesResponseType(typeof(PurchaseEntryResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PurchaseEntryResponse>> GetPurchaseEntry(string id, CancellationToken cancellationToken)
    {
        return Ok(await _service.GetPurchaseEntryAsync(id, cancellationToken));
    }
}
