using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Vrindaya.Api.Common;
using Vrindaya.Api.Constants;
using Vrindaya.Api.DTOs.Products;
using Vrindaya.Api.Interfaces;

namespace Vrindaya.Api.Controllers;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}")]
[Authorize(Policy = AppConstants.AdminOnlyPolicy)]
public class VariantController : ControllerBase
{
    private readonly IProductVariantService _variantService;
    private readonly IVariantImageService _imageService;

    public VariantController(IProductVariantService variantService, IVariantImageService imageService)
    {
        _variantService = variantService;
        _imageService = imageService;
    }

    [HttpGet("products/{productId}/variants")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(List<VariantResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<List<VariantResponse>>> GetVariants(string productId, CancellationToken ct)
    {
        var variants = await _variantService.GetVariantsAsync(productId, ct);
        return Ok(variants);
    }

    [HttpGet("variants/{variantId}")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(VariantResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<VariantResponse>> GetVariant(string variantId, CancellationToken ct)
    {
        var variant = await _variantService.GetVariantAsync(variantId, ct);
        return Ok(variant);
    }

    [HttpPost("products/{productId}/variants")]
    [ProducesResponseType(typeof(VariantResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<VariantResponse>> CreateVariant(string productId, [FromBody] CreateVariantRequest request, CancellationToken ct)
    {
        var createdBy = User.FindFirstEmail();
        var variant = await _variantService.CreateVariantAsync(productId, request, createdBy, ct);
        return CreatedAtAction(nameof(GetVariant), new { variantId = variant.Id, version = "1.0" }, variant);
    }

    [HttpPut("variants/{variantId}")]
    [ProducesResponseType(typeof(VariantResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<VariantResponse>> UpdateVariant(string variantId, [FromBody] UpdateVariantRequest request, CancellationToken ct)
    {
        var updatedBy = User.FindFirstEmail();
        var variant = await _variantService.UpdateVariantAsync(variantId, request, updatedBy, ct);
        return Ok(variant);
    }

    [HttpDelete("variants/{variantId}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteVariant(string variantId, CancellationToken ct)
    {
        await _variantService.DeleteVariantAsync(variantId, ct);
        return NoContent();
    }

    [HttpPost("variants/ids")]
    [ProducesResponseType(typeof(GeneratedIdResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<GeneratedIdResponse>> GenerateVariantId(CancellationToken ct)
    {
        var id = await _variantService.GenerateIdAsync();
        return Ok(new GeneratedIdResponse { Id = id });
    }

    [HttpPost("products/{productId}/variants/{variantId}/images")]
    [Consumes("multipart/form-data")]
    [ProducesResponseType(typeof(UploadedImageResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<UploadedImageResponse>> UploadVariantImage(
        string productId, string variantId,
        [FromForm] string slot,
        [FromForm] string? fileName,
        IFormFile file,
        CancellationToken ct)
    {
        if (!AppConstants.AllowedImageContentTypes.Contains(file.ContentType))
            return BadRequest(new ApiErrorResponse { Success = false, Message = "Only JPG, PNG, and WebP images are allowed." });

        await using var stream = file.OpenReadStream();
        var (url, publicId) = await _imageService.UploadImageAsync(productId, variantId, slot, stream, fileName, ct);
        return Ok(new UploadedImageResponse { Url = url, PublicId = publicId });
    }

    [HttpDelete("products/{productId}/variants/{variantId}/images")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> DeleteVariantImage(
        string productId, string variantId,
        [FromQuery] string publicId,
        CancellationToken ct)
    {
        await _imageService.DeleteImageAsync(productId, variantId, publicId, ct);
        return NoContent();
    }
}
