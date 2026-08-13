using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Vrindaya.Api.Common;
using Vrindaya.Api.Constants;
using Vrindaya.Api.DTOs.Homepage;
using Vrindaya.Api.Interfaces;

namespace Vrindaya.Api.Controllers;

/// <summary>
/// Vrindaya Story configuration management (homepageConfig/active). GET is
/// public; every mutation is admin-only via the AdminOnly policy (Admin or
/// Super Admin roles only, enforced by the AdminOnlyAuthorizationHandler).
/// The storefront reads the vrindayaStory config straight from Firestore, so
/// a saved configuration goes live with no code changes.
/// </summary>
[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/homepage-config")]
public class VrindayaStoryController : ControllerBase
{
    private readonly IVrindayaStoryService _service;

    public VrindayaStoryController(IVrindayaStoryService service)
    {
        _service = service;
    }

    /// <summary>Public — the current Vrindaya Story configuration, or 404 when none exists yet.</summary>
    [HttpGet("vrindaya-story")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(VrindayaStoryDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<VrindayaStoryDto>> GetVrindayaStory(CancellationToken cancellationToken)
    {
        var config = await _service.GetAsync(cancellationToken);
        return config is null ? NotFound() : Ok(config);
    }

    /// <summary>Admin-only — overwrites the vrindayaStory object on homepageConfig/active (save configuration / items).</summary>
    [HttpPut("vrindaya-story")]
    [Authorize(Policy = AppConstants.AdminOnlyPolicy)]
    [ProducesResponseType(typeof(VrindayaStoryDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<VrindayaStoryDto>> SaveVrindayaStory([FromBody] SaveVrindayaStoryRequest request, CancellationToken cancellationToken)
    {
        return Ok(await _service.SaveAsync(request, User.FindFirstEmail(), cancellationToken));
    }

    /// <summary>Admin-only — uploads one story item image to storage. Firestore is not touched; the response URL/storagePath feed the subsequent save.</summary>
    [HttpPost("vrindaya-story/items/images")]
    [Authorize(Policy = AppConstants.AdminOnlyPolicy)]
    [ProducesResponseType(typeof(VrindayaStoryImageUploadResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<VrindayaStoryImageUploadResponse>> UploadVrindayaStoryImage(IFormFile file, CancellationToken cancellationToken)
    {
        return Ok(await _service.UploadImageAsync(file, cancellationToken));
    }

    /// <summary>Admin-only — deletes a story item image by its storage path. Only assets under vrindaya-story/ are accepted.</summary>
    [HttpDelete("vrindaya-story/items/images")]
    [Authorize(Policy = AppConstants.AdminOnlyPolicy)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> DeleteVrindayaStoryImage([FromQuery] string storagePath, CancellationToken cancellationToken)
    {
        await _service.DeleteImageAsync(storagePath, cancellationToken);
        return NoContent();
    }
}
