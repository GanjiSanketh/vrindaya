using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Vrindaya.Api.Common;
using Vrindaya.Api.Constants;
using Vrindaya.Api.DTOs.Products;
using Vrindaya.Api.Interfaces;

namespace Vrindaya.Api.Controllers;

/// <summary>
/// Image upload/delete for Marketing/Campaign media — campaign images and
/// thumbnails (a thumbnail is just an image; there's no separate section
/// for it — see the Angular CampaignService). Mirrors HomepageAssetsController's
/// shape exactly.
///
/// Campaign video/document uploads are intentionally NOT covered here —
/// they remain on the pre-existing client-side Firebase Storage path for
/// now. Cloudinary's video/raw-file upload is a materially different API
/// shape (resource_type) than this app's image-only ICloudinaryService, and
/// migrating those was explicitly scoped out of the Cloudinary cutover as a
/// separate follow-up.
/// </summary>
[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/marketing-assets")]
[Authorize(Policy = AppConstants.AdminOnlyPolicy)]
public class MarketingAssetsController : ControllerBase
{
    private static readonly HashSet<string> AllowedSections = new(StringComparer.OrdinalIgnoreCase)
    {
        "campaign-images",
    };

    private readonly IMarketingStorageService _storageService;

    public MarketingAssetsController(IMarketingStorageService storageService)
    {
        _storageService = storageService;
    }

    [HttpPost("images")]
    [Consumes("multipart/form-data")]
    [ProducesResponseType(typeof(UploadedImageResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<UploadedImageResponse>> UploadImage(
        [FromForm] string section,
        [FromForm] string? fileName,
        IFormFile file,
        CancellationToken cancellationToken)
    {
        if (!AllowedSections.Contains(section))
        {
            return BadRequest(new ApiErrorResponse { Success = false, Message = $"'{section}' is not a valid marketing section." });
        }

        if (!AppConstants.AllowedImageContentTypes.Contains(file.ContentType))
        {
            return BadRequest(new ApiErrorResponse { Success = false, Message = "Only JPG, PNG, and WebP images are allowed." });
        }

        await using var stream = file.OpenReadStream();
        var (url, publicId) = await _storageService.UploadImageAsync(section.ToLowerInvariant(), stream, fileName, cancellationToken);

        return Ok(new UploadedImageResponse { Url = url, PublicId = publicId });
    }

    [HttpDelete("images")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> DeleteImage([FromQuery] string publicId, CancellationToken cancellationToken)
    {
        await _storageService.DeleteImageAsync(publicId, cancellationToken);
        return NoContent();
    }
}
