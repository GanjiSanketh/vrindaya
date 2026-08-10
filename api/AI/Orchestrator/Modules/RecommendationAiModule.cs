using Vrindaya.Api.AI.Campaigns.Models;
using Vrindaya.Api.AI.Orchestrator.Interfaces;
using Vrindaya.Api.AI.Orchestrator.Models;
using Vrindaya.Api.AI.Recommendations.DTOs;
using Vrindaya.Api.AI.Recommendations.Engines;
using Vrindaya.Api.AI.Recommendations.Services;

namespace Vrindaya.Api.AI.Orchestrator.Modules;

/// <summary>
/// Orchestratable wrapper over <see cref="IRecommendationEngine"/>. Produces
/// discount, bundle, upsell, cross-sell and clearance recommendations for the
/// supplied product pool, then hands them to
/// <see cref="IRecommendationNarrator"/> so the explanation attached to each one
/// is written by the configured AI provider.
///
/// The split is deliberate: which products are recommended, in what order, with
/// what confidence and ROI, stays deterministic — only the prose is generated.
/// </summary>
public sealed class RecommendationAiModule : IAiModule
{
    private readonly IRecommendationEngine _engine;
    private readonly IRecommendationNarrator _narrator;

    public AiModuleKey Key => AiModuleKey.Recommendation;

    public string Name => "Recommendation Engine";

    public string Role => "Suggests next actions from product attributes and orchestrated insights.";

    public RecommendationAiModule(IRecommendationEngine engine, IRecommendationNarrator narrator)
    {
        _engine = engine ?? throw new ArgumentNullException(nameof(engine));
        _narrator = narrator ?? throw new ArgumentNullException(nameof(narrator));
    }

    public async Task<object?> ExecuteAsync(AiOrchestrationContext context, CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();

        var recommendationRequest = context.Request.Recommendations ?? new RecommendationRequest
        {
            Products = context.Request.Products ?? new List<CampaignProduct>(),
        };

        var result = _engine.Generate(recommendationRequest);
        result = await _narrator.NarrateAsync(result, cancellationToken);

        context.Recommendations = result;
        return result;
    }
}