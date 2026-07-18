using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Vrindaya.Api.Common;
using Vrindaya.Api.Constants;
using Vrindaya.Api.DTOs.Pricing;
using Vrindaya.Api.Interfaces;
using Vrindaya.Api.Models;

namespace Vrindaya.Api.Controllers;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/pricing")]
[Authorize(Policy = AppConstants.AdminOnlyPolicy)]
public class PricingController : ControllerBase
{
    private readonly IPricingService _service;
    private readonly IPricingHistoryRepository _historyRepository;

    public PricingController(IPricingService service, IPricingHistoryRepository historyRepository)
    {
        _service = service;
        _historyRepository = historyRepository;
    }

    [HttpGet]
    [ProducesResponseType(typeof(PagedResult<PricingResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedResult<PricingResponse>>> GetPricing(
        [FromQuery] PricingQuery query, CancellationToken cancellationToken)
    {
        return Ok(await _service.GetPricingAsync(query, cancellationToken));
    }

    [HttpGet("{id}")]
    [ProducesResponseType(typeof(PricingResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PricingResponse>> GetOne(string id, CancellationToken cancellationToken)
    {
        return Ok(await _service.GetByIdAsync(id, cancellationToken));
    }

    [HttpGet("variants/{variantId}")]
    [ProducesResponseType(typeof(List<PricingResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<List<PricingResponse>>> GetByVariant(string variantId, CancellationToken cancellationToken)
    {
        return Ok(await _service.GetByVariantIdAsync(variantId, cancellationToken));
    }

    [HttpPost]
    [ProducesResponseType(typeof(PricingResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<PricingResponse>> Create([FromBody] CreatePricingRequest request, CancellationToken cancellationToken)
    {
        var response = await _service.CreateAsync(request, cancellationToken);
        return CreatedAtAction(nameof(GetOne), new { id = response.Id, version = "1.0" }, response);
    }

    [HttpPut("{id}")]
    [ProducesResponseType(typeof(PricingResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<PricingResponse>> Update(string id, [FromBody] UpdatePricingRequest request, CancellationToken cancellationToken)
    {
        return Ok(await _service.UpdateAsync(id, request, cancellationToken));
    }

    [HttpGet("products/{productId}")]
    [ProducesResponseType(typeof(List<ProductPricingSummaryResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<List<ProductPricingSummaryResponse>>> GetProductPricing(string productId, CancellationToken cancellationToken)
    {
        return Ok(await _service.GetProductPricingAsync(productId, cancellationToken));
    }

    [HttpPost("{id}/recalculate")]
    [ProducesResponseType(typeof(PricingResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PricingResponse>> Recalculate(string id, CancellationToken cancellationToken)
    {
        return Ok(await _service.RecalculateAsync(id, cancellationToken));
    }

    [HttpPost("bulk/preview")]
    [ProducesResponseType(typeof(BulkPricingPreviewResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<BulkPricingPreviewResponse>> BulkPreview([FromBody] BulkPricingUpdateRequest request, CancellationToken cancellationToken)
    {
        return Ok(await _service.BulkPreviewAsync(request, cancellationToken));
    }

    [HttpPost("bulk/apply")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<ActionResult> BulkApply([FromBody] BulkPricingUpdateRequest request, CancellationToken cancellationToken)
    {
        var count = await _service.BulkApplyAsync(request, cancellationToken);
        return Ok(new { applied = count });
    }

    [HttpGet("dashboard")]
    [ProducesResponseType(typeof(PricingDashboardResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<PricingDashboardResponse>> GetDashboard(CancellationToken cancellationToken)
    {
        return Ok(await _service.GetDashboardAsync(cancellationToken));
    }

    [HttpGet("export/all")]
    [ProducesResponseType(typeof(List<PricingResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<List<PricingResponse>>> GetAllExport(CancellationToken cancellationToken)
    {
        return Ok(await _service.GetAllUnpagedAsync(cancellationToken));
    }

    [HttpDelete("{id}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult> Delete(string id, CancellationToken cancellationToken)
    {
        await _service.DeleteAsync(id, cancellationToken);
        return Ok(new { deleted = true });
    }

    [HttpGet("{id}/recommendations")]
    [ProducesResponseType(typeof(PricingRecommendationResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PricingRecommendationResponse>> GetRecommendations(string id, CancellationToken cancellationToken)
    {
        return Ok(await _service.GetRecommendationsAsync(id, cancellationToken));
    }

    [HttpGet("{pricingId}/history")]
    [ProducesResponseType(typeof(PagedResult<PricingHistoryResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedResult<PricingHistoryResponse>>> GetHistory(
        string pricingId, [FromQuery] PricingHistoryQuery query, CancellationToken cancellationToken)
    {
        var page = await _historyRepository.GetByPricingIdAsync(
            pricingId, query.Cursor, query.PageSize, query.FromDate, query.ToDate, cancellationToken);

        var responses = page.Items.Select(i => new PricingHistoryResponse
        {
            Id = i.Id,
            PricingId = i.Data.PricingId,
            InventoryVariantId = i.Data.InventoryVariantId,
            Marketplace = i.Data.Marketplace,
            OldListingPrice = i.Data.OldListingPrice,
            NewListingPrice = i.Data.NewListingPrice,
            OldProfit = i.Data.OldProfit,
            NewProfit = i.Data.NewProfit,
            ChangedBy = i.Data.ChangedBy,
            Reason = i.Data.Reason,
            Timestamp = i.Data.Timestamp,
        }).ToList();

        return Ok(new PagedResult<PricingHistoryResponse>
        {
            Items = responses,
            NextCursor = page.NextCursor,
            TotalCount = page.TotalCount,
        });
    }
}
