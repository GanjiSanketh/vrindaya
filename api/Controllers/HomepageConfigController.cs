using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Vrindaya.Api.Common;
using Vrindaya.Api.Constants;
using Vrindaya.Api.DTOs.Homepage;
using Vrindaya.Api.Interfaces;

namespace Vrindaya.Api.Controllers;

/// <summary>
/// Homepage configuration management (homepageConfig/active). GET is public
/// for the admin screen; every mutation is admin-only via the AdminOnly
/// policy (Admin or Super Admin roles only, enforced by the
/// AdminOnlyAuthorizationHandler). The website reads the heroShowcase
/// config straight from Firestore, so a saved configuration goes live with
/// no code changes. Hero Showcase replaces Hero Banner as the primary hero —
/// the legacy Hero Banner APIs stay intact and act as the fallback.
/// </summary>
[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/homepage-config")]
public class HomepageConfigController : ControllerBase
{
    private readonly IHeroShowcaseService _service;

    public HomepageConfigController(IHeroShowcaseService service)
    {
        _service = service;
    }

    /// <summary>Public — the current hero showcase configuration, or 404 when none exists yet.</summary>
    [HttpGet("hero-showcase")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(HeroShowcaseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<HeroShowcaseDto>> GetHeroShowcase(CancellationToken cancellationToken)
    {
        var config = await _service.GetAsync(cancellationToken);
        return config is null ? NotFound() : Ok(config);
    }

    /// <summary>Admin-only — overwrites the heroShowcase object on homepageConfig/active (save configuration / items).</summary>
    [HttpPut("hero-showcase")]
    [Authorize(Policy = AppConstants.AdminOnlyPolicy)]
    [ProducesResponseType(typeof(HeroShowcaseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<HeroShowcaseDto>> SaveHeroShowcase([FromBody] SaveHeroShowcaseRequest request, CancellationToken cancellationToken)
    {
        return Ok(await _service.SaveAsync(request, User.FindFirstEmail(), cancellationToken));
    }

    /// <summary>Admin-only — uploads one showcase item image to storage. Firestore is not touched; the response URL/storagePath feed the subsequent save.</summary>
    [HttpPost("hero-showcase/items/images")]
    [Authorize(Policy = AppConstants.AdminOnlyPolicy)]
    [ProducesResponseType(typeof(HeroShowcaseImageUploadResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<HeroShowcaseImageUploadResponse>> UploadHeroShowcaseImage(IFormFile file, CancellationToken cancellationToken)
    {
        return Ok(await _service.UploadImageAsync(file, cancellationToken));
    }

    /// <summary>Admin-only — deletes a showcase item image by its storage path. Only assets under hero-showcase/ are accepted.</summary>
    [HttpDelete("hero-showcase/items/images")]
    [Authorize(Policy = AppConstants.AdminOnlyPolicy)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> DeleteHeroShowcaseImage([FromQuery] string storagePath, CancellationToken cancellationToken)
    {
        await _service.DeleteImageAsync(storagePath, cancellationToken);
        return NoContent();
    }
}
