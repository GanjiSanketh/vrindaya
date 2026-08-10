using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Vrindaya.Api.AI.Copilot.DTOs;
using Vrindaya.Api.AI.Copilot.Interfaces;

namespace Vrindaya.Api.Controllers;

/// <summary>
/// Conversational entry point for the business dashboard. Every message is
/// classified and routed to an existing AI module by the
/// <see cref="IAiCopilotService"/>; this controller only validates the request
/// and returns the service result — no routing or generation logic lives here.
/// </summary>
[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/ai/copilot")]
[Produces("application/json")]
[AllowAnonymous]
public class AiCopilotController : ControllerBase
{
    private readonly IAiCopilotService _copilotService;
    private readonly ILogger<AiCopilotController> _logger;

    public AiCopilotController(
        IAiCopilotService copilotService,
        ILogger<AiCopilotController> logger)
    {
        _copilotService = copilotService ?? throw new ArgumentNullException(nameof(copilotService));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    /// <summary>
    /// Sends a message to the AI copilot. The message is classified into a
    /// business intent, routed to the matching AI module through the AI
    /// orchestrator, and the module's output is returned as a copilot reply
    /// with suggested next actions.
    /// </summary>
    /// <param name="request">The operator message plus conversation and workspace context.</param>
    /// <param name="cancellationToken">Optional cancellation token.</param>
    /// <returns>An <see cref="AiCopilotResponseDto"/> built from the routed module's output.</returns>
    [HttpPost("chat")]
    [ProducesResponseType(typeof(AiCopilotResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<AiCopilotResponseDto>> Chat(
        [FromBody] AiCopilotRequestDto request,
        CancellationToken cancellationToken = default)
    {
        if (request is null)
            return BadRequest("A valid AiCopilotRequestDto is required.");

        if (string.IsNullOrWhiteSpace(request.UserMessage))
            return BadRequest("UserMessage is required.");

        cancellationToken.ThrowIfCancellationRequested();

        _logger.LogInformation(
            "AiCopilotController: chat requested for conversation '{ConversationId}' from module '{Module}'.",
            string.IsNullOrWhiteSpace(request.ConversationId) ? "(new)" : request.ConversationId,
            string.IsNullOrWhiteSpace(request.CurrentModule) ? "(unspecified)" : request.CurrentModule);

        var response = await _copilotService.AskAsync(request, cancellationToken);

        return Ok(response);
    }
}
