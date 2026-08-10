using Vrindaya.Api.AI.Copilot.DTOs;
using Vrindaya.Api.AI.Copilot.Models;

namespace Vrindaya.Api.AI.Copilot.Interfaces;

/// <summary>
/// Resolves a copilot message to a strongly typed <see cref="CopilotIntent"/>
/// using deterministic keyword rules. No AI provider is invoked.
/// </summary>
public interface IIntentClassifier
{
    /// <summary>
    /// Classifies a raw operator message.
    /// </summary>
    /// <param name="message">The operator's message.</param>
    /// <returns>The matched intent, or <see cref="CopilotIntent.Unknown"/> when nothing matches.</returns>
    CopilotIntent Classify(string message);

    /// <summary>
    /// Classifies a copilot request, falling back to the request's
    /// <see cref="AiCopilotRequestDto.CurrentModule"/> when the message alone is inconclusive.
    /// </summary>
    /// <param name="request">The copilot request.</param>
    /// <returns>The matched intent, or <see cref="CopilotIntent.Unknown"/> when nothing matches.</returns>
    /// <exception cref="ArgumentNullException">Thrown when <paramref name="request"/> is null.</exception>
    CopilotIntent Classify(AiCopilotRequestDto request);
}
