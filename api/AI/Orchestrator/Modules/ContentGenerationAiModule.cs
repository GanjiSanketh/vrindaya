using Vrindaya.Api.AI.ContentGeneration.Interfaces;
using Vrindaya.Api.AI.Orchestrator.Interfaces;
using Vrindaya.Api.AI.Orchestrator.Models;

namespace Vrindaya.Api.AI.Orchestrator.Modules;

/// <summary>
/// Orchestratable wrapper over <see cref="IContentGenerationService"/>. Produces
/// platform-ready content pieces (captions, reels, carousels, hashtags, CTAs)
/// for the request's content payload through the existing scoring + generation
/// pipeline.
/// </summary>
public sealed class ContentGenerationAiModule : IAiModule
{
    private readonly IContentGenerationService _generationService;

    public AiModuleKey Key => AiModuleKey.ContentGeneration;

    public string Name => "Content Generator";

    public string Role => "Generates platform-ready content pieces from product attributes and orchestrated context.";

    public ContentGenerationAiModule(IContentGenerationService generationService)
    {
        _generationService = generationService ?? throw new ArgumentNullException(nameof(generationService));
    }

    public async Task<object?> ExecuteAsync(AiOrchestrationContext context, CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();

        if (context.Request.Content is null)
            throw new InvalidOperationException("The Content Generation hop requires a content generation request payload.");

        var response = await _generationService.GenerateAsync(context.Request.Content, cancellationToken);
        context.Content = response;
        return response;
    }
}