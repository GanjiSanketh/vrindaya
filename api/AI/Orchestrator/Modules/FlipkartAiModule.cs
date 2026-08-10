using Vrindaya.Api.AI.Flipkart.DTOs;
using Vrindaya.Api.AI.Flipkart.Interfaces;
using Vrindaya.Api.AI.Orchestrator.Interfaces;
using Vrindaya.Api.AI.Orchestrator.Models;

namespace Vrindaya.Api.AI.Orchestrator.Modules;

/// <summary>
/// Orchestratable wrapper over <see cref="IFlipkartAiService"/>. Produces
/// Flipkart-specific optimization suggestions for the supplied product pool.
/// </summary>
public sealed class FlipkartAiModule : IAiModule
{
    private readonly IFlipkartAiService _flipkartService;

    public AiModuleKey Key => AiModuleKey.Flipkart;

    public string Name => "Flipkart Assistant";

    public string Role => "Generates Flipkart listing optimization, pricing, compliance and SEO suggestions.";

    public FlipkartAiModule(IFlipkartAiService flipkartService)
    {
        _flipkartService = flipkartService ?? throw new ArgumentNullException(nameof(flipkartService));
    }

    public async Task<object?> ExecuteAsync(AiOrchestrationContext context, CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();

        if (context.Request.Flipkart is null)
            throw new InvalidOperationException("The Flipkart hop requires a Flipkart request payload.");

        var response = await _flipkartService.GenerateSuggestionsAsync(context.Request.Flipkart, cancellationToken);
        context.Flipkart = response;
        return response;
    }
}