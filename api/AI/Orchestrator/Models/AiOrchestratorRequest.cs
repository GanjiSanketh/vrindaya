using Vrindaya.Api.AI.Campaigns.Dtos;
using Vrindaya.Api.AI.Campaigns.Models;
using Vrindaya.Api.AI.ContentGeneration.DTOs;
using Vrindaya.Api.AI.Flipkart.DTOs;
using Vrindaya.Api.AI.Recommendations.DTOs;

namespace Vrindaya.Api.AI.Orchestrator.Models;

/// <summary>
/// Input contract for the AI orchestrator. Carries the target route key plus
/// the optional module-specific payloads each hop needs. Pure request data —
/// no Firestore, no AI.
/// </summary>
public sealed class AiOrchestratorRequest
{
    /// <summary>Route key from <see cref="AiRouteCatalog"/> (e.g. "campaign", "recommendation", "full").</summary>
    public string Route { get; set; } = string.Empty;

    /// <summary>Optional caller-provided identifier; when empty the orchestrator mints one.</summary>
    public string RequestId { get; set; } = string.Empty;

    /// <summary>Payload consumed by the <see cref="AiModuleKey.Campaign"/> hop.</summary>
    public CampaignRequestDto? Campaign { get; set; }

    /// <summary>Payload consumed by the <see cref="AiModuleKey.Recommendation"/> hop.</summary>
    public RecommendationRequest? Recommendations { get; set; }

    /// <summary>Payload consumed by the <see cref="AiModuleKey.ContentGeneration"/> hop.</summary>
    public ContentGenerationRequestDto? Content { get; set; }

    /// <summary>Payload consumed by the <see cref="AiModuleKey.Flipkart"/> hop.</summary>
    public FlipkartRequestDto? Flipkart { get; set; }

    /// <summary>Fallback product pool used by the recommendation hop when no recommendation request is supplied.</summary>
    public List<CampaignProduct>? Products { get; set; }
}