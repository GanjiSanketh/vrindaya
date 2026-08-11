using System.Diagnostics;
using Vrindaya.Api.AI.Copilot.DTOs;
using Vrindaya.Api.AI.Copilot.Interfaces;
using Vrindaya.Api.AI.Core.Services;
using Vrindaya.Api.AI.Workspace.DTOs;
using Vrindaya.Api.AI.Workspace.Interfaces;
using Vrindaya.Api.AI.Workspace.Models;

namespace Vrindaya.Api.AI.Workspace.Services;

public sealed class WorkspaceOrchestrator : IWorkspaceOrchestrator
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

    private readonly IAiCopilotService _copilotService;
    private readonly IConversationMemoryService _memoryService;
    private readonly IPromptHistoryService _promptHistory;
    private readonly ILogger<WorkspaceOrchestrator> _logger;

    public WorkspaceOrchestrator(
        IAiCopilotService copilotService,
        IConversationMemoryService memoryService,
        IPromptHistoryService promptHistory,
        ILogger<WorkspaceOrchestrator> logger)
    {
        _copilotService = copilotService ?? throw new ArgumentNullException(nameof(copilotService));
        _memoryService = memoryService ?? throw new ArgumentNullException(nameof(memoryService));
        _promptHistory = promptHistory ?? throw new ArgumentNullException(nameof(promptHistory));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public async Task<WorkspaceResponseDto> ProcessAsync(
        WorkspaceRequestDto request,
        CancellationToken cancellationToken = default)
    {
        if (request is null)
            throw new ArgumentNullException(nameof(request));

        if (string.IsNullOrWhiteSpace(request.Prompt))
            throw new ArgumentException("Prompt is required.", nameof(request));

        var conversationId = GetConversationId(request.ConversationId);
        var module = MapToModule(request.WorkspaceType);

        _logger.LogInformation(
            "WorkspaceOrchestrator: processing request for workspace type '{WorkspaceType}' -> module '{Module}', conversation '{ConversationId}'.",
            request.WorkspaceType,
            module,
            conversationId);

        var copilotRequest = BuildCopilotRequest(request, module, conversationId);

        _memoryService.AddUserMessage(conversationId, request.Prompt, new Dictionary<string, string>
        {
            ["workspaceType"] = request.WorkspaceType.ToString(),
        });

        var sw = Stopwatch.StartNew();
        AiCopilotResponseDto copilotResponse;
        bool success = true;
        string? errorMessage = null;

        try
        {
            copilotResponse = await _copilotService.AskAsync(copilotRequest, cancellationToken);
        }
        catch (Exception ex)
        {
            sw.Stop();
            success = false;
            errorMessage = ex.Message;

            // Log the full failure — message, stack trace, inner-exception
            // chain and any Gemini HTTP status — before the friendly fallback
            // below replaces the response text.
            _logger.LogError(
                ex,
                "WorkspaceOrchestrator: copilot service failed for workspace type '{WorkspaceType}'. {FailureDetail}",
                request.WorkspaceType,
                AiFailureLog.Describe(ex));

            copilotResponse = new AiCopilotResponseDto
            {
                Response = "The AI service is currently unavailable. Please try again.",
                RecommendedModule = module,
                ConfidenceScore = 0,
            };
        }

        if (success)
        {
            sw.Stop();
        }

        _promptHistory.Record(new PromptHistoryEntry
        {
            Id = Guid.NewGuid().ToString("N"),
            Prompt = request.Prompt,
            Module = module,
            Provider = copilotResponse.RecommendedModule,
            ExecutionTimeMs = sw.ElapsedMilliseconds,
            Success = success,
            Timestamp = DateTime.UtcNow,
            ErrorMessage = errorMessage,
        });

        _memoryService.AddAssistantMessage(conversationId, copilotResponse.Response, new Dictionary<string, string>
        {
            ["recommendedModule"] = copilotResponse.RecommendedModule,
            ["confidence"] = copilotResponse.ConfidenceScore.ToString("F1"),
        });

        return BuildResponse(copilotResponse);
    }

    private static string GetConversationId(string? conversationId) =>
        string.IsNullOrWhiteSpace(conversationId) ? $"ws-{Guid.NewGuid():N}" : conversationId;

    private static string MapToModule(WorkspaceType type) =>
        TypeToModule.TryGetValue(type, out var module) ? module : "recommendations";

    private AiCopilotRequestDto BuildCopilotRequest(WorkspaceRequestDto request, string module, string conversationId)
    {
        var context = new Dictionary<string, string>(request.Context);

        if (request.SelectedProducts.Count > 0)
        {
            context["productIds"] = string.Join(",", request.SelectedProducts);
        }

        context["workspaceType"] = request.WorkspaceType.ToString();

        var history = _memoryService.GetHistory(conversationId);
        if (history.Count > 0)
        {
            var recentHistory = string.Join(" | ", history.TakeLast(6).Select(m => $"{m.Role}: {m.Content}"));
            context["conversationHistory"] = recentHistory;
        }

        return new AiCopilotRequestDto
        {
            UserMessage = request.Prompt,
            ConversationId = conversationId,
            Context = context,
            CurrentModule = module,
        };
    }

    private static WorkspaceResponseDto BuildResponse(AiCopilotResponseDto copilotResponse)
    {
        return new WorkspaceResponseDto
        {
            Result = copilotResponse.Response,
            GeneratedItems = copilotResponse.SuggestedActions ?? new List<string>(),
            SuggestedActions = copilotResponse.SuggestedActions ?? new List<string>(),
            Diagnostics = new Dictionary<string, string>
            {
                ["recommendedModule"] = copilotResponse.RecommendedModule,
                ["confidence"] = copilotResponse.ConfidenceScore.ToString("F1"),
            },
            Timestamp = DateTime.UtcNow,
        };
    }
}
