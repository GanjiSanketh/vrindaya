namespace Vrindaya.Api.AI.Orchestrator.Models;

/// <summary>
/// Identifiers for the AI modules the AI orchestrator can route to. Each key
/// maps to a registered <see cref="Interfaces.IAiModule"/> implementation that
/// wraps an existing downstream capability.
/// </summary>
public enum AiModuleKey
{
    Prompt,
    Campaign,
    Recommendation,
    ContentGeneration,
    Flipkart,
}