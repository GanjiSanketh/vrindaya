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
/// Mirrors CategoryController exactly. Collections are named, admin-curated
/// ordered product lists (Trending, Festive, Summer, ...) with their own
/// slug, landing page, and SEO — replacing Phase 5's ad-hoc
/// homepageConfig.featuredProductIds/trendingProductIds (see HomepageService).
/// </summary>
[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/collections")]
public class CollectionController : ControllerBase
{
    private readonly ICollectionService _service;

    public CollectionController(ICollectionService service)
    {
        _service = service;
    }

    /// <summary>Public — active/visible collections only, ordered. Metadata only — powers collection search.</summary>
    [HttpGet]
    [AllowAnonymous]
    [ProducesResponseType(typeof(List<CollectionResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<List<CollectionResponse>>> GetActive(CancellationToken cancellationToken)
    {
        return Ok(await _service.GetActiveAsync(cancellationToken));
    }

    /// <summary>Public — the collection landing page's payload (metadata + resolved products). 404 if missing or inactive+non-admin.</summary>
    [HttpGet("{slug}")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(CollectionLandingResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<CollectionLandingResponse>> GetBySlug(string slug, CancellationToken cancellationToken)
    {
        return Ok(await _service.GetLandingBySlugAsync(slug, User.IsAdmin(), cancellationToken));
    }

    [HttpGet("all")]
    [Authorize(Policy = AppConstants.AdminOnlyPolicy)]
    [ProducesResponseType(typeof(List<CollectionResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<List<CollectionResponse>>> GetAll(CancellationToken cancellationToken)
    {
        return Ok(await _service.GetAllAsync(cancellationToken));
    }

    [HttpPost]
    [Authorize(Policy = AppConstants.AdminOnlyPolicy)]
    [ProducesResponseType(typeof(CollectionResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status409Conflict)]
    public async Task<ActionResult<CollectionResponse>> Create([FromBody] CreateCollectionRequest request, CancellationToken cancellationToken)
    {
        var response = await _service.CreateAsync(request, cancellationToken);
        return CreatedAtAction(nameof(GetBySlug), new { slug = response.Id, version = "1.0" }, response);
    }

    [HttpPut("{id}")]
    [Authorize(Policy = AppConstants.AdminOnlyPolicy)]
    [ProducesResponseType(typeof(CollectionResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<CollectionResponse>> Update(string id, [FromBody] UpdateCollectionRequest request, CancellationToken cancellationToken)
    {
        return Ok(await _service.UpdateAsync(id, request, cancellationToken));
    }

    /// <summary>Active-only toggle — see ICollectionService.UpdateStatusAsync for why this is a dedicated endpoint rather than routing through the full PUT.</summary>
    [HttpPatch("{id}/status")]
    [Authorize(Policy = AppConstants.AdminOnlyPolicy)]
    [ProducesResponseType(typeof(CollectionResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<CollectionResponse>> UpdateStatus(string id, [FromBody] UpdateStatusRequest request, CancellationToken cancellationToken)
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
    public async Task<IActionResult> Reorder([FromBody] ReorderCollectionsRequest request, CancellationToken cancellationToken)
    {
        await _service.ReorderAsync(request.OrderedIds, cancellationToken);
        return NoContent();
    }
}
