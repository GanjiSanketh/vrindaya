using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Vrindaya.Api.AI.Workspace.DTOs;
using Vrindaya.Api.AI.Workspace.Interfaces;

namespace Vrindaya.Api.Controllers;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/ai/workspace")]
[Produces("application/json")]
[AllowAnonymous]
public class WorkspaceController : ControllerBase
{
    private readonly IWorkspaceService _workspaceService;
    private readonly IWorkspaceOrchestrator _workspaceOrchestrator;
    private readonly ILogger<WorkspaceController> _logger;

    public WorkspaceController(
        IWorkspaceService workspaceService,
        IWorkspaceOrchestrator workspaceOrchestrator,
        ILogger<WorkspaceController> logger)
    {
        _workspaceService = workspaceService ?? throw new ArgumentNullException(nameof(workspaceService));
        _workspaceOrchestrator = workspaceOrchestrator ?? throw new ArgumentNullException(nameof(workspaceOrchestrator));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    /// <summary>
    /// Executes a workspace request. Routes the prompt through the workspace
    /// orchestrator, which determines the workspace type and forwards to the
    /// AI copilot for processing.
    /// </summary>
    /// <param name="request">The workspace execution request.</param>
    /// <param name="cancellationToken">Optional cancellation token.</param>
    /// <returns>A <see cref="WorkspaceResponseDto"/> with the AI response and suggested actions.</returns>
    [HttpPost("execute")]
    [ProducesResponseType(typeof(WorkspaceResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<WorkspaceResponseDto>> Execute(
        [FromBody] WorkspaceRequestDto request,
        CancellationToken cancellationToken = default)
    {
        if (request is null)
            return BadRequest("A valid WorkspaceRequestDto is required.");

        if (string.IsNullOrWhiteSpace(request.Prompt))
            return BadRequest("Prompt is required.");

        cancellationToken.ThrowIfCancellationRequested();

        _logger.LogInformation(
            "WorkspaceController: execute requested for workspace type '{WorkspaceType}'.",
            request.WorkspaceType);

        var response = await _workspaceOrchestrator.ProcessAsync(request, cancellationToken);

        return Ok(response);
    }

    /// <summary>
    /// Sends a chat message within a workspace context. The message is routed
    /// through the workspace orchestrator, which forwards to the AI copilot
    /// and returns the response.
    /// </summary>
    /// <param name="request">The chat request with prompt and context.</param>
    /// <param name="cancellationToken">Optional cancellation token.</param>
    /// <returns>A <see cref="WorkspaceResponseDto"/> with the AI reply and follow-up actions.</returns>
    [HttpPost("chat")]
    [ProducesResponseType(typeof(WorkspaceResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<WorkspaceResponseDto>> Chat(
        [FromBody] WorkspaceRequestDto request,
        CancellationToken cancellationToken = default)
    {
        if (request is null)
            return BadRequest("A valid WorkspaceRequestDto is required.");

        if (string.IsNullOrWhiteSpace(request.Prompt))
            return BadRequest("Prompt is required.");

        cancellationToken.ThrowIfCancellationRequested();

        _logger.LogInformation(
            "WorkspaceController: chat requested for conversation '{ConversationId}', workspace type '{WorkspaceType}'.",
            string.IsNullOrWhiteSpace(request.ConversationId) ? "(new)" : request.ConversationId,
            request.WorkspaceType);

        var response = await _workspaceOrchestrator.ProcessAsync(request, cancellationToken);

        return Ok(response);
    }

    [HttpGet("{workspaceId}")]
    [ProducesResponseType(typeof(WorkspaceDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<WorkspaceDto>> Get(
        string workspaceId,
        CancellationToken cancellationToken = default)
    {
        var workspace = await _workspaceService.GetAsync(workspaceId, cancellationToken);

        if (workspace is null)
            return NotFound();

        return Ok(workspace);
    }

    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<WorkspaceSummaryDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<WorkspaceSummaryDto>>> List(
        [FromQuery] string userId,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(userId))
            return BadRequest("UserId is required.");

        var workspaces = await _workspaceService.ListAsync(userId, cancellationToken);
        return Ok(workspaces);
    }

    [HttpPost]
    [ProducesResponseType(typeof(WorkspaceDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<WorkspaceDto>> Create(
        [FromBody] CreateWorkspaceRequestDto request,
        CancellationToken cancellationToken = default)
    {
        if (request is null)
            return BadRequest("A valid CreateWorkspaceRequestDto is required.");

        if (string.IsNullOrWhiteSpace(request.UserId))
            return BadRequest("UserId is required.");

        var workspace = await _workspaceService.CreateAsync(request, cancellationToken);

        _logger.LogInformation("WorkspaceController: created workspace '{WorkspaceId}' for user '{UserId}'.", workspace.Id, workspace.UserId);

        return CreatedAtAction(nameof(Get), new { workspaceId = workspace.Id }, workspace);
    }

    [HttpPost("{workspaceId}/messages")]
    [ProducesResponseType(typeof(WorkspaceDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<WorkspaceDto>> SendMessage(
        string workspaceId,
        [FromBody] SendMessageRequestDto request,
        CancellationToken cancellationToken = default)
    {
        if (request is null)
            return BadRequest("A valid SendMessageRequestDto is required.");

        if (string.IsNullOrWhiteSpace(request.Content))
            return BadRequest("Message content is required.");

        var workspace = await _workspaceService.SendMessageAsync(workspaceId, request, cancellationToken);

        if (workspace is null)
            return NotFound();

        return Ok(workspace);
    }

    [HttpPatch("{workspaceId}/context")]
    [ProducesResponseType(typeof(WorkspaceDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<WorkspaceDto>> UpdateContext(
        string workspaceId,
        [FromBody] Dictionary<string, string> context,
        CancellationToken cancellationToken = default)
    {
        var workspace = await _workspaceService.UpdateContextAsync(workspaceId, context, cancellationToken);

        if (workspace is null)
            return NotFound();

        return Ok(workspace);
    }

    [HttpPost("{workspaceId}/archive")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult> Archive(
        string workspaceId,
        CancellationToken cancellationToken = default)
    {
        var archived = await _workspaceService.ArchiveAsync(workspaceId, cancellationToken);

        if (!archived)
            return NotFound();

        return NoContent();
    }

    [HttpDelete("{workspaceId}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult> Delete(
        string workspaceId,
        CancellationToken cancellationToken = default)
    {
        var deleted = await _workspaceService.DeleteAsync(workspaceId, cancellationToken);

        if (!deleted)
            return NotFound();

        return NoContent();
    }
}
