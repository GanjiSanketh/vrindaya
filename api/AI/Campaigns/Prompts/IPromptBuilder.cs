using Vrindaya.Api.AI.Campaigns.Dtos;

namespace Vrindaya.Api.AI.Campaigns.Prompts;

/// <summary>
/// Converts internal AI campaign models into a single optimized LLM prompt string.
/// </summary>
public interface IPromptBuilder
{
    /// <summary>
    /// Builds a single LLM prompt from the campaign suggestions and request context.
    /// </summary>
    /// <param name="request">The original request driving the suggestions (objective, audience, platform, etc.).</param>
    /// <param name="suggestions">Ranked campaign suggestions produced by the scoring engine.</param>
    /// <param name="budget">Optional budget hint injected into the prompt.</param>
    /// <returns>A single string prompt ready to send to an LLM.</returns>
    string Build(CampaignRequestDto? request, IReadOnlyList<CampaignSuggestionDto>? suggestions, decimal budget = 0m);
}
