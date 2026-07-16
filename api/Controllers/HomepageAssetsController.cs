using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Vrindaya.Api.Common;
using Vrindaya.Api.Constants;
using Vrindaya.Api.DTOs.Products;
using Vrindaya.Api.Interfaces;

namespace Vrindaya.Api.Controllers;

/// <summary>
/// One shared image upload/delete endpoint for every homepage CMS section
/// (hero banners, promotional banners, categories, collections, footer
/// banner, Instagram images, brand) — avoids duplicating multipart-handling
/// code across several controllers. Mirrors ProductController's
/// upload-images endpoint: upload first, get {url, publicId} back, then
/// include those in the section's own create/update request body.
/// </summary>
[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/homepage-assets")]
[Authorize(Policy = AppConstants.AdminOnlyPolicy)]
public class HomepageAssetsController : ControllerBase
{
    private static readonly HashSet<string> AllowedSections = new(StringComparer.OrdinalIgnoreCase)
    {
        "hero", "promotional", "categories", "footer", "instagram", "collections", "brand",
    };

    private readonly IHomepageStorageService _storageService;

    public HomepageAssetsController(IHomepageStorageService storageService)
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
            return BadRequest(new ApiErrorResponse { Success = false, Message = $"'{section}' is not a valid homepage section." });
        }

        if (!AppConstants.AllowedImageContentTypes.Contains(file.ContentType))
        {
            return BadRequest(new ApiErrorResponse { Success = false, Message = "Only JPG, PNG, and WebP images are allowed." });
        }

        await using var stream = file.OpenReadStream();
        var (url, publicId) = await _storageService.UploadImageAsync(section.ToLowerInvariant(), stream, fileName, cancellationToken);

        return Ok(new UploadedImageResponse { Url = url, PublicId = publicId });
    }

    /// <summary>
    /// Batch counterpart of UploadImage — one call for several images at
    /// once (e.g. adding multiple Instagram images, or a future multi-image
    /// Category/Promotional Banner flow). All-or-nothing: if any file fails
    /// the content-type check, nothing is uploaded. <paramref name="fileNames"/>
    /// follows the same optional, one-per-file contract as ProductController's
    /// batch endpoint.
    /// </summary>
    [HttpPost("images/batch")]
    [Consumes("multipart/form-data")]
    [ProducesResponseType(typeof(List<UploadedImageResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<List<UploadedImageResponse>>> UploadImages(
        [FromForm] string section,
        [FromForm] List<string>? fileNames,
        List<IFormFile> files,
        CancellationToken cancellationToken)
    {
        if (!AllowedSections.Contains(section))
        {
            return BadRequest(new ApiErrorResponse { Success = false, Message = $"'{section}' is not a valid homepage section." });
        }

        if (files.Count == 0)
        {
            return BadRequest(new ApiErrorResponse { Success = false, Message = "At least one file is required." });
        }

        if (files.Any(f => !AppConstants.AllowedImageContentTypes.Contains(f.ContentType)))
        {
            return BadRequest(new ApiErrorResponse { Success = false, Message = "Only JPG, PNG, and WebP images are allowed." });
        }

        if (fileNames is { Count: > 0 } && fileNames.Count != files.Count)
        {
            return BadRequest(new ApiErrorResponse { Success = false, Message = "fileNames must have exactly one entry per file." });
        }

        var streams = files.Select(f => f.OpenReadStream()).ToList();
        try
        {
            var namedStreams = streams
                .Select((stream, i) => (Stream: stream, FileName: fileNames is { Count: > 0 } ? fileNames[i] : null))
                .ToList();

            var uploaded = await _storageService.UploadMultipleImagesAsync(section.ToLowerInvariant(), namedStreams, cancellationToken);
            return Ok(uploaded.Select(u => new UploadedImageResponse { Url = u.Url, PublicId = u.PublicId }).ToList());
        }
        finally
        {
            foreach (var stream in streams)
            {
                await stream.DisposeAsync();
            }
        }
    }

    [HttpDelete("images")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> DeleteImage([FromQuery] string publicId, CancellationToken cancellationToken)
    {
        await _storageService.DeleteImageAsync(publicId, cancellationToken);
        return NoContent();
    }
}
