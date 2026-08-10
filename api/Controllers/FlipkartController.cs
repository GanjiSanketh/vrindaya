using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Vrindaya.Api.AI.Flipkart.Analysis;
using Vrindaya.Api.AI.Flipkart.DTOs;
using Vrindaya.Api.AI.Flipkart.Interfaces;

namespace Vrindaya.Api.Controllers;

/// <summary>
/// Exposes the Flipkart listing-generation and analysis surface to API
/// consumers. Produces Flipkart-compliant listing content (title, description,
/// features, search keywords, SEO metadata) from structured product attributes
/// via the <see cref="IFlipkartListingService"/>, and scores generated listings
/// for quality via the <see cref="IListingQualityAnalyzer"/>. Listing copy is
/// generated through the AI orchestrator by the provider "AI:Provider" selects;
/// the quality analyzer stays deterministic.
/// </summary>
[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/ai/flipkart")]
[Produces("application/json")]
[AllowAnonymous]
public class FlipkartController : ControllerBase
{
    private readonly IFlipkartListingService _listingService;
    private readonly IListingQualityAnalyzer _qualityAnalyzer;
    private readonly ILogger<FlipkartController> _logger;

    public FlipkartController(
        IFlipkartListingService listingService,
        IListingQualityAnalyzer qualityAnalyzer,
        ILogger<FlipkartController> logger)
    {
        _listingService = listingService ?? throw new ArgumentNullException(nameof(listingService));
        _qualityAnalyzer = qualityAnalyzer ?? throw new ArgumentNullException(nameof(qualityAnalyzer));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    /// <summary>
    /// Generates a complete, Flipkart-compliant product listing (optimized title,
    /// detailed description, key feature bullets, backend search keywords and SEO
    /// metadata) from structured product attributes.
    /// </summary>
    /// <param name="request">Structured product attributes for listing generation.</param>
    /// <param name="cancellationToken">Optional cancellation token.</param>
    /// <returns>A <see cref="FlipkartListingResponse"/> with the generated listing content.</returns>
    [HttpPost("generate-listing")]
    [ProducesResponseType(typeof(FlipkartListingResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<FlipkartListingResponse>> GenerateListing(
        [FromBody] FlipkartListingRequest request,
        CancellationToken cancellationToken = default)
    {
        if (request is null)
            return BadRequest("A valid FlipkartListingRequest is required.");

        if (string.IsNullOrWhiteSpace(request.ProductName))
            return BadRequest("ProductName is required.");

        cancellationToken.ThrowIfCancellationRequested();

        _logger.LogInformation(
            "FlipkartController: generate-listing requested for '{ProductName}' (Brand: {Brand}).",
            request.ProductName,
            string.IsNullOrWhiteSpace(request.Brand) ? "(unspecified)" : request.Brand);

        var response = await _listingService.GenerateListingAsync(request, cancellationToken);

        return Ok(response);
    }

    /// <summary>
    /// Analyzes a generated Flipkart listing and returns quality scores
    /// (SEO, readability, keyword density, customer appeal, Flipkart optimization)
    /// plus actionable improvement suggestions. Deterministic — no AI calls.
    /// </summary>
    /// <param name="analysisRequest">Pair of listing request attributes and generated listing.</param>
    /// <returns>A <see cref="ListingQualityAnalysis"/> with the five dimension scores and suggestions.</returns>
    [HttpPost("analyze")]
    [ProducesResponseType(typeof(ListingQualityAnalysis), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public ActionResult<ListingQualityAnalysis> Analyze(
        [FromBody] FlipkartListingAnalysisRequest analysisRequest)
    {
        if (analysisRequest?.ListingRequest is null || analysisRequest.ListingResponse is null)
            return BadRequest("Both ListingRequest and ListingResponse are required.");

        var result = _qualityAnalyzer.Analyze(
            analysisRequest.ListingRequest,
            analysisRequest.ListingResponse);

        return Ok(result);
    }
}
