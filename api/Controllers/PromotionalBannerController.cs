using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Vrindaya.Api.Constants;
using Vrindaya.Api.DTOs.Homepage;
using Vrindaya.Api.Interfaces;

namespace Vrindaya.Api.Controllers;

/// <summary>Admin-only CRUD for promotional banners. Images are uploaded via HomepageAssetsController before create/update.</summary>
[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/promotional-banners")]
[Authorize(Policy = AppConstants.AdminOnlyPolicy)]
public class PromotionalBannerController : ControllerBase
{
    private readonly IPromotionalBannerService _service;

    public PromotionalBannerController(IPromotionalBannerService service)
    {
        _service = service;
    }

    [HttpGet]
    [ProducesResponseType(typeof(List<PromotionalBannerResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<List<PromotionalBannerResponse>>> GetAll(CancellationToken cancellationToken)
    {
        return Ok(await _service.GetAllAsync(cancellationToken));
    }

    [HttpGet("{id}")]
    [ProducesResponseType(typeof(PromotionalBannerResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PromotionalBannerResponse>> GetById(string id, CancellationToken cancellationToken)
    {
        return Ok(await _service.GetByIdAsync(id, cancellationToken));
    }

    [HttpPost]
    [ProducesResponseType(typeof(PromotionalBannerResponse), StatusCodes.Status201Created)]
    public async Task<ActionResult<PromotionalBannerResponse>> Create([FromBody] CreatePromotionalBannerRequest request, CancellationToken cancellationToken)
    {
        var response = await _service.CreateAsync(request, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = response.Id, version = "1.0" }, response);
    }

    [HttpPut("{id}")]
    [ProducesResponseType(typeof(PromotionalBannerResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PromotionalBannerResponse>> Update(string id, [FromBody] UpdatePromotionalBannerRequest request, CancellationToken cancellationToken)
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
}
