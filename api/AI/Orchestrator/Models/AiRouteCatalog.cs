namespace Vrindaya.Api.AI.Orchestrator.Models;

/// <summary>
/// Static route table for the AI orchestrator. Routes only reference modules
/// with existing implementations — the campaign generator, the recommendation
/// engine, the content generator and the prompt builder — so every hop in a
/// route is executable.
/// </summary>
public static class AiRouteCatalog
{
    public static readonly string CampaignRoute = "campaign";

    public static readonly string RecommendationRoute = "recommendation";

    public static readonly string ContentGenerationRoute = "content";

    public static readonly string FlipkartRoute = "flipkart";

    public static readonly string FullRoute = "full";

    public static IReadOnlyList<AiOrchestrationRoute> Routes { get; } = new[]
    {
        new AiOrchestrationRoute(
            CampaignRoute,
            "Create Campaign",
            new[] { AiModuleKey.Campaign, AiModuleKey.Prompt }),

        new AiOrchestrationRoute(
            RecommendationRoute,
            "Product Recommendations",
            new[] { AiModuleKey.Recommendation }),

        new AiOrchestrationRoute(
            ContentGenerationRoute,
            "Content Generation",
            new[] { AiModuleKey.ContentGeneration }),

        new AiOrchestrationRoute(
            FlipkartRoute,
            "Flipkart Assistant",
            new[] { AiModuleKey.Flipkart }),

        new AiOrchestrationRoute(
            FullRoute,
            "Full Pipeline",
            new[] { AiModuleKey.Campaign, AiModuleKey.Recommendation, AiModuleKey.Prompt }),
    };
}