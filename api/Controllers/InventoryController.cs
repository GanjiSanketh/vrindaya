using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Vrindaya.Api.DTOs.Products;
using Vrindaya.Api.Interfaces;

namespace Vrindaya.Api.Controllers;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/inventory")]
public class InventoryController : ControllerBase
{
    private readonly IInventoryService _inventoryService;

    public InventoryController(IInventoryService inventoryService)
    {
        _inventoryService = inventoryService;
    }

    [HttpGet]
    public async Task<ActionResult<List<InventoryProductResponse>>> GetInventory(CancellationToken cancellationToken)
    {
        var inventory = await _inventoryService.GetInventoryAsync(cancellationToken);
        return Ok(inventory);
    }

    [HttpPatch("stock")]
    public async Task<ActionResult> UpdateStock([FromBody] BulkStockUpdateRequest request, CancellationToken cancellationToken)
    {
        await _inventoryService.UpdateStockAsync(request.Updates, cancellationToken);
        return NoContent();
    }
}
