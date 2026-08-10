using Vrindaya.Api.AI.Campaigns.Dtos;
using Vrindaya.Api.AI.Core.Models;

namespace Vrindaya.Api.AI.Core.Interfaces;

/// <summary>
/// Provider abstraction behind the core AI orchestration layer. Defines the
/// operations every AI provider must support with strongly typed inputs and
/// outputs, so the orchestrator (and callers) never observe provider-specific
/// details.
///
/// Interface only — no implementation yet. Concrete providers (mock for now,
/// real LLM providers later) plug in via Dependency Injection.
/// </summary>
public interface IAiProvider
{
    /// <summary>Human-readable provider name (e.g. the mock provider or a real LLM provider).</summary>
    string ProviderName { get; }

    /// <summary>Whether this provider is a mock (no external API calls).</summary>
    bool IsMock { get; }

    /// <summary>
    /// Generates campaign suggestions for the supplied request.
    /// </summary>
    /// <param name="request">Generation parameters (objective, platform, filters, etc.).</param>
    /// <param name="cancellationToken">Optional cancellation token.</param>
    /// <returns>The strongly typed campaign response.</returns>
    Task<CampaignResponseDto> GenerateAsync(
        CampaignRequestDto request,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Summarizes an existing AI response (e.g. a generated campaign set).
    /// </summary>
    /// <param name="source">The response to summarize.</param>
    /// <param name="cancellationToken">Optional cancellation token.</param>
    /// <returns>The strongly typed summary response.</returns>
    Task<AiSummaryResponse> SummarizeAsync(
        CampaignResponseDto source,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Verifies provider availability and reachability.
    /// </summary>
    /// <param name="cancellationToken">Optional cancellation token.</param>
    /// <returns>The strongly typed health status.</returns>
    Task<AiProviderHealthStatus> HealthCheckAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Executes a free-form prompt and returns the generated text. This is the
    /// generation surface every non-campaign module needs (content copy,
    /// Flipkart listing fields, product intelligence narratives, workspace
    /// answers), expressed once here so those modules keep depending only on
    /// the orchestrator.
    /// </summary>
    /// <param name="prompt">The prompt to execute.</param>
    /// <param name="systemInstruction">Optional instruction shaping the answer.</param>
    /// <param name="responseMimeType">Optional MIME type requested (e.g. "application/json").</param>
    /// <param name="cancellationToken">Optional cancellation token.</param>
    /// <returns>The generated text.</returns>
    Task<string> GenerateTextAsync(
        string prompt,
        string? systemInstruction = null,
        string? responseMimeType = null,
        CancellationToken cancellationToken = default);
}