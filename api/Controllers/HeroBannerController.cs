using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Vrindaya.Api.Common;
using Vrindaya.Api.Constants;
using Vrindaya.Api.DTOs.HeroBanners;
using Vrindaya.Api.Interfaces;

namespace Vrindaya.Api.Controllers;

/// <summary>
/// Hero banner management. GET (public) lets the storefront — and the admin
/// page — read the current active banner; every mutation is admin-only via
/// the AdminOnly policy (Admin or SuperAdmin roles only, enforced by the
/// AdminOnlyAuthorizationHandler). The website reads the banner directly
/// from Firestore, so a published banner goes live with no code changes.
/// </summary>
[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/hero-banners")]
public class HeroBannerController : ControllerBase
{
    private readonly IHeroBannerService _service;

    public HeroBannerController(IHeroBannerService service)
    {
        _service = service;
    }

    /// <summary>Public — the current active banner, or 404 when none exists yet.</summary>
    [HttpGet("active")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(HeroBannerDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<HeroBannerDto>> GetActive(CancellationToken cancellationToken)
    {
        var banner = await _service.GetActiveAsync(cancellationToken);
        return banner is null ? NotFound() : Ok(banner);
    }

    /// <summary>Admin-only — overwrites the active banner document (save changes / publish).</summary>
    [HttpPut("active")]
    [Authorize(Policy = AppConstants.AdminOnlyPolicy)]
    [ProducesResponseType(typeof(HeroBannerDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<HeroBannerDto>> Save([FromBody] SaveHeroBannerRequest request, CancellationToken cancellationToken)
    {
        return Ok(await _service.SaveAsync(request, User.FindFirstEmail(), cancellationToken));
    }

    /// <summary>Admin-only — uploads the desktop banner image to storage. Firestore is not touched; the response URL/storagePath feed the subsequent save.</summary>
    [HttpPost("active/desktop-image")]
    [Authorize(Policy = AppConstants.AdminOnlyPolicy)]
    [ProducesResponseType(typeof(HeroBannerImageUploadResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<HeroBannerImageUploadResponse>> UploadDesktopImage(IFormFile file, CancellationToken cancellationToken)
    {
        return Ok(await _service.UploadDesktopImageAsync(file, cancellationToken));
    }

    /// <summary>Admin-only — uploads the mobile banner image to storage. Firestore is not touched; the response URL/storagePath feed the subsequent save.</summary>
    [HttpPost("active/mobile-image")]
    [Authorize(Policy = AppConstants.AdminOnlyPolicy)]
    [ProducesResponseType(typeof(HeroBannerImageUploadResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<HeroBannerImageUploadResponse>> UploadMobileImage(IFormFile file, CancellationToken cancellationToken)
    {
        return Ok(await _service.UploadMobileImageAsync(file, cancellationToken));
    }

    /// <summary>Admin-only — deletes an unsaved (pending) hero banner image by its storage path. Only assets under hero-banners/ are accepted.</summary>
    [HttpDelete("active/image")]
    [Authorize(Policy = AppConstants.AdminOnlyPolicy)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> DeleteImage([FromQuery] string storagePath, CancellationToken cancellationToken)
    {
        await _service.DeleteImageAsync(storagePath, cancellationToken);
        return NoContent();
    }
}
