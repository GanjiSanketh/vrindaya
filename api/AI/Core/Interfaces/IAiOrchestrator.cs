using Vrindaya.Api.AI.Campaigns.Dtos;
using Vrindaya.Api.AI.Core.Configuration;
using Vrindaya.Api.AI.Core.Models;

namespace Vrindaya.Api.AI.Core.Interfaces;

/// <summary>
/// Core AI orchestration entry point. Receives campaign generation requests,
/// selects the configured AI provider, builds the prompt, executes the AI
/// request and returns the AI response. The orchestrator is provider-agnostic —
/// it depends only on the <see cref="IAiProvider"/> abstraction and never
/// observes provider-specific details.
///
/// Provider routing (Mock vs Gemini) is resolved from configuration by
/// <see cref="IAiProviderSelector"/>, so no caller — controller, service or
/// engine — ever branches on the provider itself.
/// </summary>
public interface IAiOrchestrator
{
    /// <summary>The provider currently serving orchestrated requests.</summary>
    AiProviderType ActiveProvider { get; }

    /// <summary>Human-readable name of the provider currently serving requests.</summary>
    string ActiveProviderName { get; }

    /// <summary>
    /// Orchestrates campaign generation for the supplied request end to end:
    /// prompt construction + provider execution.
    /// </summary>
    /// <param name="request">Generation parameters (objective, platform, filters, etc.).</param>
    /// <param name="cancellationToken">Optional cancellation token.</param>
    /// <returns>The AI response containing the generated campaigns.</returns>
    /// <exception cref="ArgumentNullException">Thrown when <paramref name="request"/> is null.</exception>
    /// <exception cref="ArgumentException">Thrown when <see cref="CampaignRequestDto.MaximumCampaigns"/> is less than 1.</exception>
    Task<CampaignResponseDto> GenerateCampaignsAsync(
        CampaignRequestDto request,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Routes a summarization request to the configured provider.
    /// </summary>
    /// <param name="source">The campaign response to summarize.</param>
    /// <param name="cancellationToken">Optional cancellation token.</param>
    /// <returns>The provider's summary response.</returns>
    Task<AiSummaryResponse> SummarizeAsync(
        CampaignResponseDto source,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Probes the configured provider's availability.
    /// </summary>
    /// <param name="cancellationToken">Optional cancellation token.</param>
    /// <returns>The provider's health status.</returns>
    Task<AiProviderHealthStatus> HealthCheckAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Routes a free-form prompt to the active provider and returns the
    /// generated text. This is the path every non-campaign module uses
    /// (content, Flipkart listings, product intelligence, workspace), so those
    /// modules never hold a provider reference or branch on provider names.
    ///
    /// When the mock provider is active the call is served deterministically;
    /// when Gemini is active it is a real API call. Callers supply the module
    /// name purely so usage and diagnostics attribute the request correctly.
    /// </summary>
    /// <param name="prompt">The prompt to execute. Must not be blank.</param>
    /// <param name="systemInstruction">Optional instruction shaping the answer.</param>
    /// <param name="module">Module label recorded in telemetry (e.g. "content").</param>
    /// <param name="cancellationToken">Optional cancellation token.</param>
    /// <returns>The generated text.</returns>
    Task<string> GenerateTextAsync(
        string prompt,
        string? systemInstruction = null,
        string? module = null,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// As <see cref="GenerateTextAsync"/>, but asks the provider for JSON and
    /// deserializes it into <typeparamref name="TValue"/>. Returns
    /// <c>null</c> when the active provider cannot produce a usable payload, so
    /// callers can fall back deterministically instead of failing a request.
    /// </summary>
    /// <typeparam name="TValue">Contract the model is asked to emit.</typeparam>
    /// <param name="prompt">The prompt to execute. Must not be blank.</param>
    /// <param name="systemInstruction">Instruction describing the expected JSON shape.</param>
    /// <param name="module">Module label recorded in telemetry.</param>
    /// <param name="cancellationToken">Optional cancellation token.</param>
    /// <returns>The parsed payload, or null when unavailable/unparsable.</returns>
    Task<TValue?> GenerateJsonAsync<TValue>(
        string prompt,
        string? systemInstruction = null,
        string? module = null,
        CancellationToken cancellationToken = default)
        where TValue : class;
}
