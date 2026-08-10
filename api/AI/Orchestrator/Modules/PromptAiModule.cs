using Vrindaya.Api.AI.Campaigns.Dtos;
using Vrindaya.Api.AI.Campaigns.Prompts;
using Vrindaya.Api.AI.Orchestrator.Interfaces;
using Vrindaya.Api.AI.Orchestrator.Models;

namespace Vrindaya.Api.AI.Orchestrator.Modules;

/// <summary>
/// Orchestratable wrapper over <see cref="IPromptBuilder"/>. Assembles a single
/// LLM brief from the request context and the campaign suggestions produced by
/// an earlier campaign hop.
/// </summary>
public sealed class PromptAiModule : IAiModule
{
    private readonly IPromptBuilder _promptBuilder;

    public AiModuleKey Key => AiModuleKey.Prompt;

    public string Name => "Prompt Builder";

    public string Role => "Assembles structured, provider-agnostic prompts from orchestrated instructions.";

    public PromptAiModule(IPromptBuilder promptBuilder)
    {
        _promptBuilder = promptBuilder ?? throw new ArgumentNullException(nameof(promptBuilder));
    }

    public Task<object?> ExecuteAsync(AiOrchestrationContext context, CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();

        var prompt = _promptBuilder.Build(
            context.Request.Campaign,
            context.Campaign?.Campaigns ?? new List<CampaignSuggestionDto>());

        context.Prompt = prompt;
        return Task.FromResult<object?>(prompt);
    }
}