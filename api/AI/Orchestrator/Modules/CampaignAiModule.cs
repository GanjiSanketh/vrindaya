using Vrindaya.Api.AI.Campaigns.Interfaces;
using Vrindaya.Api.AI.Orchestrator.Interfaces;
using Vrindaya.Api.AI.Orchestrator.Models;

namespace Vrindaya.Api.AI.Orchestrator.Modules;

/// <summary>
/// Orchestratable wrapper over <see cref="ICampaignGenerationService"/>. Produces
/// ranked campaign suggestions for the request's campaign payload through the
/// existing scoring + generation pipeline.
/// </summary>
public sealed class CampaignAiModule : IAiModule
{
    private readonly ICampaignGenerationService _generationService;

    public AiModuleKey Key => AiModuleKey.Campaign;

    public string Name => "Campaign Generator";

    public string Role => "Builds campaign structures, cadence and channel plans end to end.";

    public CampaignAiModule(ICampaignGenerationService generationService)
    {
        _generationService = generationService ?? throw new ArgumentNullException(nameof(generationService));
    }

    public async Task<object?> ExecuteAsync(AiOrchestrationContext context, CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();

        if (context.Request.Campaign is null)
            throw new InvalidOperationException("The Campaign hop requires a campaign request payload.");

        var response = await _generationService.GenerateCampaignsAsync(context.Request.Campaign, cancellationToken);
        context.Campaign = response;
        return response;
    }
}