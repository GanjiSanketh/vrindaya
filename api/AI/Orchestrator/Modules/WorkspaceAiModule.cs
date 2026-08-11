using System.Diagnostics;
using Microsoft.Extensions.Logging;
using Vrindaya.Api.AI.Core.Interfaces;
using Vrindaya.Api.AI.Core.Services;
using Vrindaya.Api.AI.Orchestrator.Interfaces;
using Vrindaya.Api.AI.Orchestrator.Models;
using IAiCoreOrchestrator = Vrindaya.Api.AI.Core.Interfaces.IAiOrchestrator;
using Vrindaya.Api.AI.Workspace.DTOs;
using Vrindaya.Api.AI.Workspace.Interfaces;
using Vrindaya.Api.AI.Workspace.Models;

namespace Vrindaya.Api.AI.Orchestrator.Modules;

/// <summary>
/// Orchestratable wrapper over the AI Workspace's conversation flow. Executes a
/// workspace prompt through the shared conversation memory and the core
/// <see cref="IAiCoreOrchestrator"/> — the same provider-agnostic generation path
/// every other module uses — so workspace replies are real model output when
/// Gemini is active. The module never holds a provider or copilot reference;
/// conversation continuity comes from <see cref="IConversationMemoryService"/>
/// and per-run telemetry from <see cref="IPromptHistoryService"/>.
/// </summary>
public sealed class WorkspaceAiModule : IAiModule
{
    private static readonly Dictionary<WorkspaceType, string> TypeToModule = new()
    {
        [WorkspaceType.Flipkart] = "flipkart",
        [WorkspaceType.Instagram] = "content",
        [WorkspaceType.Campaign] = "campaigns",
        [WorkspaceType.ProductIntelligence] = "flipkart",
        [WorkspaceType.Recommendation] = "recommendations",
        [WorkspaceType.Analytics] = "recommendations",
        [WorkspaceType.Dashboard] = "recommendations",
        [WorkspaceType.GeneralChat] = "recommendations",
    };

    /// <summary>Telemetry label for prompts issued by this module.</summary>
    private const string ModuleName = "workspace";

    /// <summary>Instruction pinning the model to a plain, grounded workspace answer.</summary>
    private const string SystemInstruction =
        "You are the AI assistant inside Vrindaya's business workspace — Vrindaya is an Indian handmade " +
        "ethnic apparel brand. Answer the user directly in plain text: no markdown, no lists, no preamble. " +
        "Use the conversation history and the workspace context supplied; if the context is thin, say so " +
        "plainly rather than inventing detail. Never mention prompts, routes, hops or providers.";

    private readonly IConversationMemoryService _memoryService;
    private readonly IPromptHistoryService _promptHistory;
    private readonly IAiCoreOrchestrator _aiOrchestrator;
    private readonly ILogger<WorkspaceAiModule> _logger;

    public AiModuleKey Key => AiModuleKey.Workspace;

    public string Name => "AI Workspace";

    public string Role => "Processes workspace conversations with memory and provider-agnostic AI generation.";

    public WorkspaceAiModule(
        IConversationMemoryService memoryService,
        IPromptHistoryService promptHistory,
        IAiCoreOrchestrator aiOrchestrator,
        ILogger<WorkspaceAiModule> logger)
    {
        _memoryService = memoryService ?? throw new ArgumentNullException(nameof(memoryService));
        _promptHistory = promptHistory ?? throw new ArgumentNullException(nameof(promptHistory));
        _aiOrchestrator = aiOrchestrator ?? throw new ArgumentNullException(nameof(aiOrchestrator));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public async Task<object?> ExecuteAsync(AiOrchestrationContext context, CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();

        if (context.Request.Workspace is null)
            throw new InvalidOperationException("The Workspace hop requires a workspace request payload.");

        var request = context.Request.Workspace;

        if (string.IsNullOrWhiteSpace(request.Prompt))
            throw new ArgumentException("Prompt is required.", nameof(request));

        var conversationId = GetConversationId(request.ConversationId);
        var module = MapToModule(request.WorkspaceType);

        _logger.LogInformation(
            "WorkspaceAiModule: processing prompt for workspace type '{WorkspaceType}' -> module '{Module}', conversation '{ConversationId}'.",
            request.WorkspaceType,
            module,
            conversationId);

        _memoryService.AddUserMessage(conversationId, request.Prompt, new Dictionary<string, string>
        {
            ["workspaceType"] = request.WorkspaceType.ToString(),
        });

        var sw = Stopwatch.StartNew();
        string reply;
        bool success = true;
        string? errorMessage = null;

        try
        {
            var prompt = BuildPrompt(request, conversationId);
            reply = await _aiOrchestrator.GenerateTextAsync(
                prompt, SystemInstruction, ModuleName, cancellationToken);

            // An empty provider reply is a failure, never content — never
            // returned as an empty string.
            reply = string.IsNullOrWhiteSpace(reply)
                ? "The AI provider returned an empty response. Please try again."
                : reply.Trim();
        }
        catch (Exception ex)
        {
            sw.Stop();
            success = false;
            errorMessage = ex.Message;

            // Log the full failure — message, stack trace, inner-exception
            // chain and any Gemini HTTP status — before the friendly fallback
            // below replaces the reply text.
            _logger.LogError(
                ex,
                "WorkspaceAiModule: AI generation failed for workspace type '{WorkspaceType}'. {FailureDetail}",
                request.WorkspaceType,
                AiFailureLog.Describe(ex));

            reply = "The AI service is currently unavailable. Please try again.";
        }

        sw.Stop();

        _promptHistory.Record(new PromptHistoryEntry
        {
            Id = Guid.NewGuid().ToString("N"),
            Prompt = request.Prompt,
            Module = module,
            Provider = _aiOrchestrator.ActiveProviderName,
            ExecutionTimeMs = sw.ElapsedMilliseconds,
            Success = success,
            Timestamp = DateTime.UtcNow,
            ErrorMessage = errorMessage,
        });

        _memoryService.AddAssistantMessage(conversationId, reply, new Dictionary<string, string>
        {
            ["module"] = module,
        });

        var response = new WorkspaceResponseDto
        {
            Result = reply,
            GeneratedItems = new List<string>(),
            SuggestedActions = new List<string>(),
            Diagnostics = new Dictionary<string, string>
            {
                ["module"] = module,
                ["provider"] = _aiOrchestrator.ActiveProviderName,
            },
            Timestamp = DateTime.UtcNow,
        };

        context.Workspace = response;
        return response;
    }

    private static string GetConversationId(string? conversationId) =>
        string.IsNullOrWhiteSpace(conversationId) ? $"ws-{Guid.NewGuid():N}" : conversationId;

    private static string MapToModule(WorkspaceType type) =>
        TypeToModule.TryGetValue(type, out var module) ? module : "recommendations";

    /// <summary>
    /// Renders the workspace request into a brief the provider can answer from.
    /// Recent conversation memory is included ahead of the prompt so follow-ups
    /// resolve; selected products and the workspace type supply the context.
    /// </summary>
    private string BuildPrompt(WorkspaceRequestDto request, string conversationId)
    {
        var sb = new System.Text.StringBuilder();

        var history = _memoryService.GetHistory(conversationId);
        var recent = history.TakeLast(6).ToList();
        if (recent.Count > 0)
        {
            sb.AppendLine("# Conversation So Far");
            sb.AppendLine();
            foreach (var message in recent)
            {
                sb.AppendLine($"{message.Role}: {message.Content}");
            }
            sb.AppendLine();
        }

        sb.AppendLine("# Workspace Request");
        sb.AppendLine();
        sb.AppendLine(request.Prompt.Trim());
        sb.AppendLine();

        sb.AppendLine("# Workspace Context");
        sb.AppendLine();
        sb.AppendLine($"Workspace type: {request.WorkspaceType}");

        if (request.SelectedProducts.Count > 0)
        {
            sb.AppendLine($"Selected products: {string.Join(", ", request.SelectedProducts)}");
        }

        return sb.ToString();
    }
}
