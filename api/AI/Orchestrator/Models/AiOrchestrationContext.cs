using Vrindaya.Api.AI.Campaigns.Dtos;
using Vrindaya.Api.AI.ContentGeneration.DTOs;
using Vrindaya.Api.AI.Flipkart.DTOs;
using Vrindaya.Api.AI.Recommendations.DTOs;
using Vrindaya.Api.AI.Workspace.DTOs;

namespace Vrindaya.Api.AI.Orchestrator.Models;

/// <summary>
/// Shared state passed between hops during a single orchestration run. Each
/// module reads the inputs it needs and writes its output for downstream hops.
/// </summary>
public sealed class AiOrchestrationContext
{
    public AiOrchestratorRequest Request { get; }

    /// <summary>Output of the <see cref="AiModuleKey.Campaign"/> hop, when executed.</summary>
    public CampaignResponseDto? Campaign { get; set; }

    /// <summary>Output of the <see cref="AiModuleKey.Recommendation"/> hop, when executed.</summary>
    public RecommendationCollection? Recommendations { get; set; }

    /// <summary>Output of the <see cref="AiModuleKey.ContentGeneration"/> hop, when executed.</summary>
    public ContentGenerationResponseDto? Content { get; set; }

    /// <summary>Output of the <see cref="AiModuleKey.Flipkart"/> hop, when executed.</summary>
    public FlipkartResponseDto? Flipkart { get; set; }

    /// <summary>Output of the <see cref="AiModuleKey.Prompt"/> hop, when executed.</summary>
    public string? Prompt { get; set; }

    /// <summary>Output of the <see cref="AiModuleKey.Workspace"/> hop, when executed.</summary>
    public WorkspaceResponseDto? Workspace { get; set; }

    public AiOrchestrationContext(AiOrchestratorRequest request)
    {
        Request = request ?? throw new ArgumentNullException(nameof(request));
    }
}