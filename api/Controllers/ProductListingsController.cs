using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Vrindaya.Api.Common;
using Vrindaya.Api.Constants;
using Vrindaya.Api.DTOs.ListingManagement;
using Vrindaya.Api.Interfaces;

namespace Vrindaya.Api.Controllers;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/product-listings")]
[Authorize(Policy = AppConstants.AdminOnlyPolicy)]
public class ProductListingsController : ControllerBase
{
    private readonly IProductListingService _service;

    public ProductListingsController(IProductListingService service)
    {
        _service = service;
    }

    [HttpGet]
    [ProducesResponseType(typeof(PagedResult<ProductListingResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedResult<ProductListingResponse>>> GetAll(
        [FromQuery] ProductListingQuery query, CancellationToken cancellationToken)
    {
        return Ok(await _service.GetAllAsync(query, cancellationToken));
    }

    [HttpGet("{id}")]
    [ProducesResponseType(typeof(ProductListingResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ProductListingResponse>> GetById(string id, CancellationToken cancellationToken)
    {
        return Ok(await _service.GetByIdAsync(id, cancellationToken));
    }

    [HttpPut("{id}")]
    [ProducesResponseType(typeof(ProductListingResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ProductListingResponse>> Update(
        string id, [FromBody] UpdateProductListingRequest request, CancellationToken cancellationToken)
    {
        var updatedBy = User.FindFirstEmail();
        return Ok(await _service.UpdateAsync(id, request, updatedBy, cancellationToken));
    }

    [HttpGet("dashboard")]
    [ProducesResponseType(typeof(MarketplaceDashboardResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<MarketplaceDashboardResponse>> GetDashboard(CancellationToken cancellationToken)
    {
        return Ok(await _service.GetDashboardAsync(cancellationToken));
    }

    [HttpPatch("bulk-status")]
    [ProducesResponseType(typeof(List<ProductListingResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<List<ProductListingResponse>>> BulkUpdateStatus(
        [FromBody] BulkUpdateListingStatusRequest request, CancellationToken cancellationToken)
    {
        var updatedBy = User.FindFirstEmail();
        return Ok(await _service.BulkUpdateStatusAsync(request, updatedBy, cancellationToken));
    }
}
