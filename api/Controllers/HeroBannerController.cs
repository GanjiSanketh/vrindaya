using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Vrindaya.Api.Constants;
using Vrindaya.Api.DTOs.Homepage;
using Vrindaya.Api.Interfaces;

namespace Vrindaya.Api.Controllers;

/// <summary>Admin-only CRUD for hero banners. Images are uploaded separately via HomepageAssetsController before create/update — see its doc comment.</summary>
[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/hero-banners")]
[Authorize(Policy = AppConstants.AdminOnlyPolicy)]
public class HeroBannerController : ControllerBase
{
    private readonly IHeroBannerService _service;

    public HeroBannerController(IHeroBannerService service)
    {
        _service = service;
    }

    [HttpGet]
    [ProducesResponseType(typeof(List<HeroBannerResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<List<HeroBannerResponse>>> GetAll(CancellationToken cancellationToken)
    {
        return Ok(await _service.GetAllAsync(cancellationToken));
    }

    [HttpGet("{id}")]
    [ProducesResponseType(typeof(HeroBannerResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<HeroBannerResponse>> GetById(string id, CancellationToken cancellationToken)
    {
        return Ok(await _service.GetByIdAsync(id, cancellationToken));
    }

    [HttpPost]
    [ProducesResponseType(typeof(HeroBannerResponse), StatusCodes.Status201Created)]
    public async Task<ActionResult<HeroBannerResponse>> Create([FromBody] CreateHeroBannerRequest request, CancellationToken cancellationToken)
    {
        var response = await _service.CreateAsync(request, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = response.Id, version = "1.0" }, response);
    }

    [HttpPut("{id}")]
    [ProducesResponseType(typeof(HeroBannerResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<HeroBannerResponse>> Update(string id, [FromBody] UpdateHeroBannerRequest request, CancellationToken cancellationToken)
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
