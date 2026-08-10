using Microsoft.Extensions.Logging;
using Vrindaya.Api.AI.Campaigns.Dtos;
using Vrindaya.Api.AI.Campaigns.Prompts;
using Vrindaya.Api.AI.Core.Interfaces;

namespace Vrindaya.Api.AI.Content.Generators;

/// <summary>
/// Generates a five-slide Instagram carousel (slide copy plus a call-to-action)
/// for a campaign. The shared <see cref="IPromptBuilder"/> assembles the creative
/// brief and the core <see cref="IAiOrchestrator"/> executes it against the
/// configured provider, so the slides are real model output when Gemini is
/// active.
/// </summary>
public sealed class CarouselGenerator
{
    private readonly IPromptBuilder _promptBuilder;
    private readonly IAiOrchestrator _orchestrator;
    private readonly ILogger<CarouselGenerator> _logger;

    /// <summary>Number of slides the carousel contract always carries.</summary>
    private const int SlideCount = 5;

    /// <summary>Telemetry label for prompts issued by this generator.</summary>
    private const string ModuleName = "content.carousel";

    /// <summary>Instruction pinning the model to the carousel contract.</summary>
    private const string SystemInstruction =
        "You write Instagram carousel copy for Vrindaya, an Indian handmade ethnic apparel brand. " +
        "Reply with JSON only — no markdown, no commentary. " +
        "Use this exact shape: {\"slides\":[string,string,string,string,string],\"cta\":string}. " +
        "Return exactly 5 slides in order — cover, detail, styling, offer, closing — each one short line " +
        "of on-slide copy. The CTA is a short button-style phrase.";

    public CarouselGenerator(
        IPromptBuilder promptBuilder,
        IAiOrchestrator orchestrator,
        ILogger<CarouselGenerator> logger)
    {
        _promptBuilder = promptBuilder ?? throw new ArgumentNullException(nameof(promptBuilder));
        _orchestrator = orchestrator ?? throw new ArgumentNullException(nameof(orchestrator));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    /// <summary>
    /// Generates a carousel for the supplied campaign request using the shared
    /// prompt builder and the configured AI provider.
    /// </summary>
    /// <param name="request">Campaign parameters driving the carousel.</param>
    /// <param name="cancellationToken">Optional cancellation token.</param>
    /// <returns>The generated carousel content.</returns>
    /// <exception cref="ArgumentNullException">Thrown when <paramref name="request"/> is null.</exception>
    public async Task<CarouselContent> GenerateAsync(
        CampaignRequestDto request,
        CancellationToken cancellationToken = default)
    {
        if (request is null)
            throw new ArgumentNullException(nameof(request));

        var prompt = _promptBuilder.Build(request, null);

        _logger.LogInformation(
            "Carousel generation starting — prompt built ({PromptLength} chars), routing to {Provider}.",
            prompt.Length, _orchestrator.ActiveProviderName);

        var generated = await _orchestrator.GenerateJsonAsync<CarouselCopy>(
            prompt, SystemInstruction, ModuleName, cancellationToken);

        // Normalized to exactly five entries so a short or over-long answer
        // still maps cleanly onto the fixed Slide1..Slide5 contract.
        var slides = Normalize(generated?.Slides);

        var carousel = new CarouselContent
        {
            Slide1 = slides[0],
            Slide2 = slides[1],
            Slide3 = slides[2],
            Slide4 = slides[3],
            Slide5 = slides[4],
            Cta = string.IsNullOrWhiteSpace(generated?.Cta) ? string.Empty : generated!.Cta!.Trim(),
        };

        _logger.LogInformation(
            "Carousel generation complete — five slides and a CTA produced.");

        return carousel;
    }

    /// <summary>
    /// Projects the model's slide list onto exactly <see cref="SlideCount"/>
    /// entries: missing slides become empty, extra slides are dropped.
    /// </summary>
    private static string[] Normalize(IReadOnlyList<string>? slides)
    {
        var normalized = new string[SlideCount];

        for (var i = 0; i < SlideCount; i++)
        {
            var value = slides is not null && i < slides.Count ? slides[i] : null;
            normalized[i] = string.IsNullOrWhiteSpace(value) ? string.Empty : value!.Trim();
        }

        return normalized;
    }

    /// <summary>Contract the model is asked to return.</summary>
    private sealed class CarouselCopy
    {
        public List<string>? Slides { get; set; }

        public string? Cta { get; set; }
    }
}
