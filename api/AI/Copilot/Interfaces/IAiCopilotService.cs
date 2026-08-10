using Vrindaya.Api.AI.Copilot.DTOs;

namespace Vrindaya.Api.AI.Copilot.Interfaces;

/// <summary>
/// Conversational entry point for the business dashboard. Resolves the
/// operator's message to one of the existing AI orchestration routes, executes
/// it through the hub-and-spoke orchestrator and shapes the module output into
/// a copilot reply. The copilot never generates content itself — every result
/// originates from an existing AI module.
/// </summary>
public interface IAiCopilotService
{
    /// <summary>
    /// Routes a copilot message to the matching AI module and returns the
    /// module's output as a copilot response.
    /// </summary>
    /// <param name="request">The operator message plus conversation and workspace context.</param>
    /// <param name="cancellationToken">Optional cancellation token.</param>
    /// <returns>An <see cref="AiCopilotResponseDto"/> built from the routed module's output.</returns>
    /// <exception cref="ArgumentNullException">Thrown when <paramref name="request"/> is null.</exception>
    /// <exception cref="ArgumentException">Thrown when the user message is empty.</exception>
    Task<AiCopilotResponseDto> AskAsync(
        AiCopilotRequestDto request,
        CancellationToken cancellationToken = default);
}
