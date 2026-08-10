using Microsoft.Extensions.Logging;
using Vrindaya.Api.AI.Campaigns.Dtos;
using Vrindaya.Api.AI.Campaigns.Prompts;
using Vrindaya.Api.AI.Core.Interfaces;

namespace Vrindaya.Api.AI.Content.Generators;

/// <summary>
/// Generates a structured short-form video script (hook, three scenes, ending,
/// CTA) for a campaign. The shared <see cref="IPromptBuilder"/> assembles the
/// creative brief and the core <see cref="IAiOrchestrator"/> executes it against
/// the configured provider, so the script is real model output when Gemini is
/// active.
/// </summary>
public sealed class ReelScriptGenerator
{
    private readonly IPromptBuilder _promptBuilder;
    private readonly IAiOrchestrator _orchestrator;
    private readonly ILogger<ReelScriptGenerator> _logger;

    /// <summary>Telemetry label for prompts issued by this generator.</summary>
    private const string ModuleName = "content.reel";

    /// <summary>Instruction pinning the model to the reel-script contract.</summary>
    private const string SystemInstruction =
        "You write short-form video scripts for Vrindaya, an Indian handmade ethnic apparel brand. " +
        "Reply with JSON only — no markdown, no commentary. " +
        "Use this exact shape: {\"hook\":string,\"scene1\":string,\"scene2\":string,\"scene3\":string," +
        "\"ending\":string,\"cta\":string}. " +
        "The hook is one line under 12 words; each scene is one shot description with on-screen action; " +
        "the CTA is a short button-style phrase. Target a 20-30 second reel.";

    public ReelScriptGenerator(
        IPromptBuilder promptBuilder,
        IAiOrchestrator orchestrator,
        ILogger<ReelScriptGenerator> logger)
    {
        _promptBuilder = promptBuilder ?? throw new ArgumentNullException(nameof(promptBuilder));
        _orchestrator = orchestrator ?? throw new ArgumentNullException(nameof(orchestrator));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    /// <summary>
    /// Generates a reel script for the supplied campaign request using the
    /// shared prompt builder and the configured AI provider.
    /// </summary>
    /// <param name="request">Campaign parameters driving the script.</param>
    /// <param name="cancellationToken">Optional cancellation token.</param>
    /// <returns>The generated reel script.</returns>
    /// <exception cref="ArgumentNullException">Thrown when <paramref name="request"/> is null.</exception>
    public async Task<ReelScript> GenerateAsync(
        CampaignRequestDto request,
        CancellationToken cancellationToken = default)
    {
        if (request is null)
            throw new ArgumentNullException(nameof(request));

        var prompt = _promptBuilder.Build(request, null);

        _logger.LogInformation(
            "Reel script generation starting — prompt built ({PromptLength} chars), routing to {Provider}.",
            prompt.Length, _orchestrator.ActiveProviderName);

        var generated = await _orchestrator.GenerateJsonAsync<ReelScriptCopy>(
            prompt, SystemInstruction, ModuleName, cancellationToken);

        var script = new ReelScript
        {
            Hook = Clean(generated?.Hook),
            Scene1 = Clean(generated?.Scene1),
            Scene2 = Clean(generated?.Scene2),
            Scene3 = Clean(generated?.Scene3),
            Ending = Clean(generated?.Ending),
            Cta = Clean(generated?.Cta),
        };

        _logger.LogInformation(
            "Reel script generation complete — script has a hook, 3 scenes, an ending and a CTA.");

        return script;
    }

    private static string Clean(string? value) =>
        string.IsNullOrWhiteSpace(value) ? string.Empty : value!.Trim();

    /// <summary>Contract the model is asked to return.</summary>
    private sealed class ReelScriptCopy
    {
        public string? Hook { get; set; }

        public string? Scene1 { get; set; }

        public string? Scene2 { get; set; }

        public string? Scene3 { get; set; }

        public string? Ending { get; set; }

        public string? Cta { get; set; }
    }
}
