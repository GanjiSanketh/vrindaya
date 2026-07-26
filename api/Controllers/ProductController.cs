using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Vrindaya.Api.Common;
using Vrindaya.Api.Common.Exceptions;
using Vrindaya.Api.Constants;
using Vrindaya.Api.DTOs.Products;
using Vrindaya.Api.Interfaces;
using Vrindaya.Api.Models;

namespace Vrindaya.Api.Controllers;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/products")]
public class ProductController : ControllerBase
{
    private readonly IProductService _productService;
    private readonly ILogger<ProductController> _logger;

    public ProductController(IProductService productService, ILogger<ProductController> logger)
    {
        _productService = productService;
        _logger = logger;
    }

    /// <summary>Public: active products only. Admins (valid Bearer token, admin email): everything, including drafts.</summary>
    [HttpGet]
    [AllowAnonymous]
    [ProducesResponseType(typeof(PagedProductsResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedProductsResponse>> GetProducts([FromQuery] ProductQuery query, CancellationToken cancellationToken)
    {
        var response = await _productService.GetProductsAsync(query, User.IsAdmin(), cancellationToken);
        return Ok(response);
    }

    /// <summary>404 (not 403) if the product is inactive and the caller isn't admin — doesn't leak draft existence.</summary>
    [HttpGet("{id}")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(ProductDetailResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ProductDetailResponse>> GetProductById(string id, CancellationToken cancellationToken)
    {
        var response = await _productService.GetProductByIdAsync(id, User.IsAdmin(), cancellationToken);
        return Ok(response);
    }

    /// <summary>
    /// Public-only, always active-only. Firestore has no full-text search —
    /// this matches the query's tokenized words against each product's
    /// precomputed SearchKeywords (name+brand+category+sku+tags). A literal
    /// "search" segment always wins over the "{id}" route above for this
    /// exact path (ASP.NET Core routing prefers the more specific match).
    /// </summary>
    [HttpGet("search")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(PagedProductsResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedProductsResponse>> SearchProducts(
        [FromQuery] string q,
        [FromQuery] int pageSize,
        [FromQuery] string? cursor,
        CancellationToken cancellationToken)
    {
        var response = await _productService.SearchProductsAsync(q, pageSize == 0 ? 24 : pageSize, cursor, cancellationToken);
        return Ok(response);
    }

    /// <summary>
    /// Local Firestore doc-id generation — zero Firestore writes. Lets the
    /// admin form start uploading images (POST .../upload-images) before
    /// the product document itself is created.
    /// </summary>
    [HttpPost("ids")]
    [Authorize(Policy = AppConstants.AdminOnlyPolicy)]
    [ProducesResponseType(typeof(GeneratedIdResponse), StatusCodes.Status200OK)]
    public ActionResult<GeneratedIdResponse> GenerateId()
    {
        return Ok(new GeneratedIdResponse { Id = _productService.GenerateId() });
    }

    [HttpPost]
    [Authorize(Policy = AppConstants.AdminOnlyPolicy)]
    [ProducesResponseType(typeof(ProductDetailResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status409Conflict)]
    public async Task<ActionResult<ProductDetailResponse>> CreateProduct([FromBody] CreateProductRequest request, CancellationToken cancellationToken)
    {
        if (!ModelState.IsValid)
        {
            foreach (var kv in ModelState)
            {
                var key = kv.Key;
                foreach (var err in kv.Value.Errors)
                {
                    _logger.LogWarning("Validation error on {Key}: {Message} (attempted {Value})",
                        key, err.ErrorMessage, kv.Value.AttemptedValue);
                }
            }
            var errors = ModelState
                .Where(kv => kv.Value.Errors.Count > 0)
                .ToDictionary(
                    kv => kv.Key,
                    kv => kv.Value.Errors.Select(e => e.ErrorMessage).ToArray()
                );
            return BadRequest(new { message = "Validation failed. Check the request payload.", errors });
        }

        var flipkartUrls = request.Variants?.Select(v => v.FlipkartUrl).ToList();
        _logger.LogInformation("[Step 4] CreateProduct: request has {Count} variants, flipkartUrl values: {@FlipkartUrls}", request.Variants?.Count ?? 0, flipkartUrls);
        var createdBy = User.FindFirstEmail();
        var response = await _productService.CreateProductAsync(request, createdBy, cancellationToken);
        return CreatedAtAction(nameof(GetProductById), new { id = response.Id, version = "1.0" }, response);
    }

    /// <summary>Returns all variant image metadata for a product — never downloads or transforms images, only reads Firestore documents.</summary>
    [HttpGet("{id}/images")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(ProductImagesResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status504GatewayTimeout)]
    public async Task<ActionResult<ProductImagesResponse>> GetProductImages(string id, CancellationToken cancellationToken)
    {
        _logger.LogInformation("Entering GetProductImages for product {ProductId}", id);

        try
        {
            using var timeoutCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
            timeoutCts.CancelAfter(TimeSpan.FromSeconds(30));

            _logger.LogDebug("Loading variant images for product {ProductId}", id);
            var response = await _productService.GetProductImagesAsync(id, User.IsAdmin(), timeoutCts.Token);

            _logger.LogInformation("Returning GetProductImages for product {ProductId} — {Count} variants", id, response.Variants.Count);
            return Ok(response);
        }
        catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)
        {
            _logger.LogError("GetProductImages timed out for product {ProductId}", id);
            return StatusCode(StatusCodes.Status504GatewayTimeout, new ApiErrorResponse
            {
                Success = false,
                Message = "The request timed out while loading product images. Please try again.",
            });
        }
        catch (ProductNotFoundException)
        {
            _logger.LogWarning("GetProductImages: product {ProductId} not found", id);
            return NotFound(new ApiErrorResponse { Success = false, Message = "Product not found." });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "GetProductImages failed for product {ProductId}", id);
            return StatusCode(StatusCodes.Status500InternalServerError, new ApiErrorResponse
            {
                Success = false,
                Message = "An unexpected error occurred while loading product images.",
            });
        }
    }

    [HttpPut("{id}")]
    [Authorize(Policy = AppConstants.AdminOnlyPolicy)]
    [ProducesResponseType(typeof(ProductDetailResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status409Conflict)]
    public async Task<ActionResult<ProductDetailResponse>> UpdateProduct(string id, [FromBody] UpdateProductRequest request, CancellationToken cancellationToken)
    {
        if (!ModelState.IsValid)
        {
            foreach (var kv in ModelState)
            {
                var key = kv.Key;
                foreach (var err in kv.Value.Errors)
                {
                    _logger.LogWarning("Validation error on {Key}: {Message} (attempted {Value})",
                        key, err.ErrorMessage, kv.Value.AttemptedValue);
                }
            }
            var errors = ModelState
                .Where(kv => kv.Value.Errors.Count > 0)
                .ToDictionary(
                    kv => kv.Key,
                    kv => kv.Value.Errors.Select(e => e.ErrorMessage).ToArray()
                );
            return BadRequest(new { message = "Validation failed. Check the request payload.", errors });
        }

        var flipkartUrls = request.Variants?.Select(v => v.FlipkartUrl).ToList();
        _logger.LogInformation("[Step 4] UpdateProduct: request has {Count} variants, flipkartUrl values: {@FlipkartUrls}", request.Variants?.Count ?? 0, flipkartUrls);
        var updatedBy = User.FindFirstEmail();
        var response = await _productService.UpdateProductAsync(id, request, updatedBy, cancellationToken);
        return Ok(response);
    }

    /// <summary>
    /// Permanently deletes the product — removes the Firestore document,
    /// every variant, every product gallery image, and every variant image
    /// from Cloudinary. Returns a structured JSON response so the admin UI
    /// can show a success message without re-fetching.
    /// </summary>
    [HttpDelete("{id}")]
    [Authorize(Policy = AppConstants.AdminOnlyPolicy)]
    [ProducesResponseType(typeof(DeleteProductResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<DeleteProductResponse>> DeleteProduct(string id, CancellationToken cancellationToken)
    {
        var deletedBy = User.FindFirstEmail();
        var response = await _productService.PermanentlyDeleteProductAsync(id, deletedBy, cancellationToken);
        return Ok(response);
    }

    [HttpPost("{id}/restore")]
    [Authorize(Policy = AppConstants.AdminOnlyPolicy)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> RestoreProduct(string id, CancellationToken cancellationToken)
    {
        var updatedBy = User.FindFirstEmail();
        await _productService.RestoreProductAsync(id, updatedBy, cancellationToken);
        return NoContent();
    }

    /// <summary>Copies the product end-to-end (including its Storage images) under a new id — see IProductService.DuplicateProductAsync for exactly what is/isn't copied.</summary>
    [HttpPost("{id}/duplicate")]
    [Authorize(Policy = AppConstants.AdminOnlyPolicy)]
    [ProducesResponseType(typeof(ProductDetailResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ProductDetailResponse>> DuplicateProduct(string id, CancellationToken cancellationToken)
    {
        var createdBy = User.FindFirstEmail();
        var response = await _productService.DuplicateProductAsync(id, createdBy, cancellationToken);
        return CreatedAtAction(nameof(GetProductById), new { id = response.Id, version = "1.0" }, response);
    }

    [HttpPatch("bulk-status")]
    [Authorize(Policy = AppConstants.AdminOnlyPolicy)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> BulkUpdateStatus([FromBody] BulkStatusRequest request, CancellationToken cancellationToken)
    {
        var updatedBy = User.FindFirstEmail();
        await _productService.BulkUpdateStatusAsync(request.Ids, request.Active, updatedBy, cancellationToken);
        return NoContent();
    }

    /// <summary>Bulk mark/remove one Featured/NewArrival/BestSeller flag — see BulkFlagRequest.</summary>
    [HttpPatch("bulk-flag")]
    [Authorize(Policy = AppConstants.AdminOnlyPolicy)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> BulkUpdateFlag([FromBody] BulkFlagRequest request, CancellationToken cancellationToken)
    {
        var updatedBy = User.FindFirstEmail();
        await _productService.BulkUpdateFlagAsync(request.Ids, request.Flag, request.Value, updatedBy, cancellationToken);
        return NoContent();
    }

    /// <summary>Bulk soft delete — the bulk counterpart of DELETE /products/{id}. Storage untouched, fully restorable via bulk-restore.</summary>
    [HttpPost("bulk-delete")]
    [Authorize(Policy = AppConstants.AdminOnlyPolicy)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> BulkSoftDelete([FromBody] BulkRestoreRequest request, CancellationToken cancellationToken)
    {
        var updatedBy = User.FindFirstEmail();
        await _productService.BulkSoftDeleteAsync(request.Ids, updatedBy, cancellationToken);
        return NoContent();
    }

    [HttpPost("bulk-restore")]
    [Authorize(Policy = AppConstants.AdminOnlyPolicy)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> BulkRestore([FromBody] BulkRestoreRequest request, CancellationToken cancellationToken)
    {
        var updatedBy = User.FindFirstEmail();
        await _productService.BulkRestoreAsync(request.Ids, updatedBy, cancellationToken);
        return NoContent();
    }

    /// <summary>
    /// One file per call — the admin gallery drops/tracks each file's own
    /// progress/error/retry state independently. Final image order is
    /// decided entirely by the admin's drag-reorder and sent as part of
    /// Images[] on Save (PUT/POST) — this endpoint has no notion of order.
    [HttpPatch("{id}/status")]
    [Authorize(Policy = AppConstants.AdminOnlyPolicy)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateStatus(string id, [FromBody] UpdateStatusRequest request, CancellationToken cancellationToken)
    {
        var updatedBy = User.FindFirstEmail();
        await _productService.UpdateStatusAsync(id, request.Active, updatedBy, cancellationToken);
        return NoContent();
    }

    /// <summary>Single-product edit of every Flipkart Operations field — backs the Flipkart Ops admin screen's edit modal. Independent of the main product PUT.</summary>
    [HttpPatch("{id}/flipkart-ops")]
    [Authorize(Policy = AppConstants.AdminOnlyPolicy)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateFlipkartOps(string id, [FromBody] UpdateFlipkartOpsRequest request, CancellationToken cancellationToken)
    {
        var updatedBy = User.FindFirstEmail();
        await _productService.UpdateFlipkartOpsAsync(id, request, updatedBy, cancellationToken);
        return NoContent();
    }

    /// <summary>"Bulk Update URLs" — per-id url+sku pairs (unique per product, unlike the shared-value bulk actions below).</summary>
    [HttpPatch("bulk-flipkart-urls")]
    [Authorize(Policy = AppConstants.AdminOnlyPolicy)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> BulkUpdateFlipkartUrls([FromBody] BulkFlipkartUrlsRequest request, CancellationToken cancellationToken)
    {
        var updatedBy = User.FindFirstEmail();
        await _productService.BulkUpdateFlipkartUrlsAsync(request.Items, updatedBy, cancellationToken);
        return NoContent();
    }

    /// <summary>"Bulk Launch" — sets LifecycleStage=ListedOnFlipkart + LaunchDate on every selected id in one write. Free-choice/"Bulk Archive" lifecycle-stage updates now live on InventoryController/ILifecycleService (Phase 8) — no longer Flipkart-specific.</summary>
    [HttpPost("bulk-launch")]
    [Authorize(Policy = AppConstants.AdminOnlyPolicy)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> BulkLaunch([FromBody] BulkLaunchRequest request, CancellationToken cancellationToken)
    {
        var updatedBy = User.FindFirstEmail();
        await _productService.BulkLaunchAsync(request.Ids, request.LaunchDate, updatedBy, cancellationToken);
        return NoContent();
    }
}
