using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Vrindaya.Api.AI.Campaigns.Dtos;
using Vrindaya.Api.AI.Content.Generators;

namespace Vrindaya.Api.Controllers;

/// <summary>
/// Exposes the AI content generators — Instagram post copy, reel scripts,
/// carousels and image prompts — as mock APIs backed by the shared prompt
/// builder and the mock AI provider.
/// </summary>
[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/ai/content")]
public class ContentController : ControllerBase
{
    private readonly InstagramContentGenerator _instagramGenerator;
    private readonly ReelScriptGenerator _reelScriptGenerator;
    private readonly CarouselGenerator _carouselGenerator;
    private readonly ImagePromptGenerator _imagePromptGenerator;
    private readonly ILogger<ContentController> _logger;

    public ContentController(
        InstagramContentGenerator instagramGenerator,
        ReelScriptGenerator reelGenerator,
        CarouselGenerator carouselGenerator,
        ImagePromptGenerator imagePromptGenerator,
        ILogger<ContentController> logger)
    {
        _instagramGenerator = instagramGenerator ?? throw new ArgumentNullException(nameof(instagramGenerator));
        _reelScriptGenerator = reelGenerator ?? throw new ArgumentNullException(nameof(reelGenerator));
        _carouselGenerator = carouselGenerator ?? throw new ArgumentNullException(nameof(carouselGenerator));
        _imagePromptGenerator = imagePromptGenerator ?? throw new ArgumentNullException(nameof(imagePromptGenerator));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    /// <summary>
    /// Generates Instagram-ready content (caption, hashtags, CTA, emoji suggestions).
    /// </summary>
    [HttpPost("instagram")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(InstagramContent), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<InstagramContent>> Instagram(
        [FromBody] CampaignRequestDto request,
        CancellationToken cancellationToken)
    {
        var content = await _instagramGenerator.GenerateAsync(request, cancellationToken);

        _logger.LogInformation(
            "Content API: returned Instagram content for objective {Objective}.",
            request.PreferredObjective);

        return Ok(content);
    }

    /// <summary>
    /// Generates a structured reel script (hook, scenes, ending, CTA).
    /// </summary>
    [HttpPost("reel")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(ReelScript), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ReelScript>> Reel(
        [FromBody] CampaignRequestDto request,
        CancellationToken cancellationToken)
    {
        var script = await _reelScriptGenerator.GenerateAsync(request, cancellationToken);

        _logger.LogInformation(
            "Content API: returned reel script for objective {Objective}.",
            request.PreferredObjective);

        return Ok(script);
    }

    /// <summary>
    /// Generates a five-slide carousel with a call-to-action.
    /// </summary>
    [HttpPost("carousel")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(CarouselContent), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<CarouselContent>> Carousel(
        [FromBody] CampaignRequestDto request,
        CancellationToken cancellationToken)
    {
        var carousel = await _carouselGenerator.GenerateAsync(request, cancellationToken);

        _logger.LogInformation(
            "Content API: returned carousel for objective {Objective}.",
            request.PreferredObjective);

        return Ok(carousel);
    }

    /// <summary>
    /// Generates text-to-image prompts (ChatGPT Images, Midjourney, Flux,
    /// Stable Diffusion). No image is created — prompt text only.
    /// </summary>
    [HttpPost("image-prompt")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(ImagePromptSet), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public ActionResult<ImagePromptSet> ImagePrompt(
        [FromBody] CampaignRequestDto request)
    {
        var productName = string.IsNullOrWhiteSpace(request?.ProductIds?.FirstOrDefault())
            ? "our handcrafted ethnic piece"
            : request.ProductIds[0];

        var set = _imagePromptGenerator.Generate(request.PreferredObjective, productName);

        _logger.LogInformation(
            "Content API: returned image prompts for objective {Objective}.",
            request.PreferredObjective);

        return Ok(set);
    }
}