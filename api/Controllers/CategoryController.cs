using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Vrindaya.Api.Common;
using Vrindaya.Api.Constants;
using Vrindaya.Api.DTOs.Homepage;
using Vrindaya.Api.DTOs.Products;
using Vrindaya.Api.Interfaces;

namespace Vrindaya.Api.Controllers;

/// <summary>
/// Evolved from Phase 4's static in-memory CategoriesController — now
/// Firestore-backed so admin can add/edit/reorder/hide categories without a
/// code deploy. GET stays public/unauthenticated; every mutation is
/// admin-only.
/// </summary>
[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/categories")]
public class CategoryController : ControllerBase
{
    private readonly ICategoryService _service;

    public CategoryController(ICategoryService service)
    {
        _service = service;
    }

    /// <summary>Public — active/visible categories only, ordered.</summary>
    [HttpGet]
    [ProducesResponseType(typeof(List<CategoryResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<List<CategoryResponse>>> GetActive(CancellationToken cancellationToken)
    {
        return Ok(await _service.GetActiveAsync(cancellationToken));
    }

    [HttpGet("all")]
    [Authorize(Policy = AppConstants.AdminOnlyPolicy)]
    [ProducesResponseType(typeof(List<CategoryResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<List<CategoryResponse>>> GetAll(CancellationToken cancellationToken)
    {
        return Ok(await _service.GetAllAsync(cancellationToken));
    }

    [HttpPost]
    [Authorize(Policy = AppConstants.AdminOnlyPolicy)]
    [ProducesResponseType(typeof(CategoryResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status409Conflict)]
    public async Task<ActionResult<CategoryResponse>> Create([FromBody] CreateCategoryRequest request, CancellationToken cancellationToken)
    {
        var response = await _service.CreateAsync(request, cancellationToken);
        return CreatedAtAction(nameof(GetAll), new { version = "1.0" }, response);
    }

    [HttpPut("{id}")]
    [Authorize(Policy = AppConstants.AdminOnlyPolicy)]
    [ProducesResponseType(typeof(CategoryResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<CategoryResponse>> Update(string id, [FromBody] UpdateCategoryRequest request, CancellationToken cancellationToken)
    {
        return Ok(await _service.UpdateAsync(id, request, cancellationToken));
    }

    /// <summary>Active-only toggle — see ICategoryService.UpdateStatusAsync for why this is a dedicated endpoint rather than routing through the full PUT.</summary>
    [HttpPatch("{id}/status")]
    [Authorize(Policy = AppConstants.AdminOnlyPolicy)]
    [ProducesResponseType(typeof(CategoryResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<CategoryResponse>> UpdateStatus(string id, [FromBody] UpdateStatusRequest request, CancellationToken cancellationToken)
    {
        return Ok(await _service.UpdateStatusAsync(id, request.Active, cancellationToken));
    }

    [HttpDelete("{id}")]
    [Authorize(Policy = AppConstants.AdminOnlyPolicy)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(string id, CancellationToken cancellationToken)
    {
        await _service.DeleteAsync(id, cancellationToken);
        return NoContent();
    }

    [HttpPatch("reorder")]
    [Authorize(Policy = AppConstants.AdminOnlyPolicy)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Reorder([FromBody] ReorderCategoriesRequest request, CancellationToken cancellationToken)
    {
        await _service.ReorderAsync(request.OrderedIds, cancellationToken);
        return NoContent();
    }
}
