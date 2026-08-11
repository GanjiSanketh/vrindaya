using System.Text;
using Vrindaya.Api.AI.Campaigns.Dtos;
using Vrindaya.Api.AI.ContentGeneration.DTOs;
using Vrindaya.Api.AI.ContentGeneration.Models;
using Vrindaya.Api.AI.Copilot.DTOs;
using Vrindaya.Api.AI.Copilot.Interfaces;
using Vrindaya.Api.AI.Copilot.Models;
using Vrindaya.Api.AI.Flipkart.DTOs;
using Vrindaya.Api.AI.Orchestrator.Interfaces;
using Vrindaya.Api.AI.Orchestrator.Models;
using Vrindaya.Api.AI.Recommendations.DTOs;

namespace Vrindaya.Api.AI.Copilot.Services;

/// <summary>
/// Default <see cref="IAiCopilotService"/>. Classifies the operator's message
/// with <see cref="IIntentClassifier"/>, maps the resolved
/// <see cref="CopilotIntent"/> to a route in <see cref="AiRouteCatalog"/>,
/// builds the payload that route's hops require, and delegates execution to
/// <see cref="IAiOrchestrator"/>.
///
/// The copilot decides nothing on its own: routing is keyword classification,
/// and the suggested actions and generated payload are projections of the
/// routed module's output. The conversational reply is written by the
/// configured AI provider through
/// <see cref="Core.Interfaces.IAiOrchestrator.GenerateTextAsync"/>, grounded in
/// what the modules actually produced — so the operator reads an answer rather
/// than a pipeline status line. A failed or empty route still reports its own
/// status text, since there is nothing to answer from.
/// </summary>
public sealed class AiCopilotService : IAiCopilotService
{
    /// <summary>Maximum follow-up actions surfaced to the operator.</summary>
    private const int MaxSuggestedActions = 5;

    /// <summary>Confidence reported when every hop on the route completed cleanly.</summary>
    private const double HealthyConfidence = 90d;

    /// <summary>Confidence reported when a hop was skipped or degraded.</summary>
    private const double DegradedConfidence = 40d;

    /// <summary>
    /// Maps each classified intent onto the orchestration route that serves it.
    /// Every intent resolves to a route backed by an existing AI module; the
    /// dashboard and analytics intents reuse the recommendation route, which is
    /// the module that produces business next-actions.
    /// </summary>
    private static readonly Dictionary<CopilotIntent, string> IntentRoutes = new()
    {
        [CopilotIntent.FlipkartListing] = AiRouteCatalog.FlipkartRoute,
        [CopilotIntent.Campaign] = AiRouteCatalog.CampaignRoute,
        [CopilotIntent.Instagram] = AiRouteCatalog.ContentGenerationRoute,
        [CopilotIntent.Reel] = AiRouteCatalog.ContentGenerationRoute,
        [CopilotIntent.Carousel] = AiRouteCatalog.ContentGenerationRoute,
        [CopilotIntent.ProductIntelligence] = AiRouteCatalog.FlipkartRoute,
        [CopilotIntent.Recommendation] = AiRouteCatalog.RecommendationRoute,
        [CopilotIntent.Dashboard] = AiRouteCatalog.RecommendationRoute,
        [CopilotIntent.Analytics] = AiRouteCatalog.RecommendationRoute,
    };

    /// <summary>Content format requested by each content-producing intent.</summary>
    private static readonly Dictionary<CopilotIntent, ContentType> IntentContentTypes = new()
    {
        [CopilotIntent.Instagram] = ContentType.Post,
        [CopilotIntent.Reel] = ContentType.Reel,
        [CopilotIntent.Carousel] = ContentType.Carousel,
    };

    /// <summary>Flipkart assistance mode requested by each Flipkart-bound intent.</summary>
    private static readonly Dictionary<CopilotIntent, FlipkartAssistanceType> IntentAssistanceTypes = new()
    {
        [CopilotIntent.FlipkartListing] = FlipkartAssistanceType.ListingOptimization,
        [CopilotIntent.ProductIntelligence] = FlipkartAssistanceType.FullAudit,
    };

    /// <summary>Route used when no intent can be resolved from the message or the current module.</summary>
    private static readonly string FallbackRoute = AiRouteCatalog.RecommendationRoute;

    /// <summary>Telemetry label for prompts issued by the copilot.</summary>
    private const string ModuleName = "copilot";

    /// <summary>Instruction keeping the reply grounded in the module output.</summary>
    private const string SystemInstruction =
        "You are the AI copilot inside Vrindaya's admin console — Vrindaya is an Indian handmade " +
        "ethnic apparel brand. Answer the operator directly in at most 3 plain-text sentences: no " +
        "markdown, no lists, no preamble. Base the answer only on the module results supplied; if " +
        "they are thin, say so plainly rather than inventing detail. Never mention prompts, routes, " +
        "hops or providers.";

    private readonly IIntentClassifier _intentClassifier;
    private readonly IAiOrchestrator _orchestrator;
    private readonly Core.Interfaces.IAiOrchestrator _aiOrchestrator;
    private readonly ILogger<AiCopilotService> _logger;

    public AiCopilotService(
        IIntentClassifier intentClassifier,
        IAiOrchestrator orchestrator,
        Core.Interfaces.IAiOrchestrator aiOrchestrator,
        ILogger<AiCopilotService> logger)
    {
        _intentClassifier = intentClassifier ?? throw new ArgumentNullException(nameof(intentClassifier));
        _orchestrator = orchestrator ?? throw new ArgumentNullException(nameof(orchestrator));
        _aiOrchestrator = aiOrchestrator ?? throw new ArgumentNullException(nameof(aiOrchestrator));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public async Task<AiCopilotResponseDto> AskAsync(
        AiCopilotRequestDto request,
        CancellationToken cancellationToken = default)
    {
        if (request is null)
            throw new ArgumentNullException(nameof(request));

        if (string.IsNullOrWhiteSpace(request.UserMessage))
            throw new ArgumentException("A user message must be supplied.", nameof(request));

        var intent = _intentClassifier.Classify(request);
        var route = ResolveRoute(intent);

        _logger.LogInformation(
            "AI Copilot: conversation {ConversationId} classified as {Intent}, routed to '{Route}' from module '{Module}'.",
            request.ConversationId, intent, route, request.CurrentModule);

        var orchestration = await _orchestrator.ExecuteAsync(
            BuildOrchestratorRequest(request, intent, route),
            cancellationToken);

        _logger.LogInformation(
            "AI Copilot: conversation {ConversationId} completed - {Status} in {DurationMs}ms.",
            request.ConversationId, orchestration.Status, orchestration.DurationMs);

        var actions = ExtractActions(orchestration);
        var reply = await BuildReplyAsync(request, orchestration, actions, cancellationToken);

        return ToResponse(orchestration, intent, route, reply, actions);
    }

    // -------------------------------------------------------------------
    // Routing — intent to orchestration route
    // -------------------------------------------------------------------

    private static string ResolveRoute(CopilotIntent intent) =>
        IntentRoutes.TryGetValue(intent, out var route) ? route : FallbackRoute;

    // -------------------------------------------------------------------
    // Payload assembly - each route receives the payload its hops require
    // -------------------------------------------------------------------

    private static AiOrchestratorRequest BuildOrchestratorRequest(
        AiCopilotRequestDto request,
        CopilotIntent intent,
        string route)
    {
        var festival = ContextValue(request, "festival");
        var audience = ContextValue(request, "audience");
        var productIds = SplitContextList(ContextValue(request, "productIds"));

        var orchestratorRequest = new AiOrchestratorRequest
        {
            Route = route,
            RequestId = request.ConversationId,
            Products = [],
        };

        if (route == AiRouteCatalog.CampaignRoute || route == AiRouteCatalog.FullRoute)
        {
            orchestratorRequest.Campaign = new CampaignRequestDto
            {
                FestivalName = festival,
                TargetAudience = string.IsNullOrWhiteSpace(audience) ? "General" : audience,
                ProductIds = productIds,
            };
        }

        if (route == AiRouteCatalog.RecommendationRoute || route == AiRouteCatalog.FullRoute)
        {
            orchestratorRequest.Recommendations = new RecommendationRequest
            {
                Products = [],
                Category = NullIfBlank(ContextValue(request, "category")),
                ProductIds = productIds,
            };
        }

        if (route == AiRouteCatalog.ContentGenerationRoute)
        {
            orchestratorRequest.Content = new ContentGenerationRequestDto
            {
                Products = [],
                ContentType = IntentContentTypes.TryGetValue(intent, out var contentType)
                    ? contentType
                    : ContentType.Post,
                Platform = ContentPlatform.Instagram,
                FestivalName = festival,
                TargetAudience = string.IsNullOrWhiteSpace(audience) ? "General" : audience,
                ProductIds = productIds,
            };
        }

        if (route == AiRouteCatalog.FlipkartRoute)
        {
            orchestratorRequest.Flipkart = new FlipkartRequestDto
            {
                Products = [],
                AssistanceType = IntentAssistanceTypes.TryGetValue(intent, out var assistanceType)
                    ? assistanceType
                    : FlipkartAssistanceType.ListingOptimization,
                TargetCategory = NullIfBlank(ContextValue(request, "category")),
            };
        }

        return orchestratorRequest;
    }

    private static string ContextValue(AiCopilotRequestDto request, string key) =>
        request.Context.TryGetValue(key, out var value) ? value ?? string.Empty : string.Empty;

    private static string? NullIfBlank(string value) =>
        string.IsNullOrWhiteSpace(value) ? null : value;

    private static List<string> SplitContextList(string value) =>
        string.IsNullOrWhiteSpace(value)
            ? []
            : [.. value.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)];

    // -------------------------------------------------------------------
    // Response projection - reads only what the modules already produced
    // -------------------------------------------------------------------

    private static AiCopilotResponseDto ToResponse(
        AiOrchestrationResponse orchestration,
        CopilotIntent intent,
        string route,
        string reply,
        List<string> actions)
    {
        var healthy = orchestration.Hops.Count > 0 && orchestration.Hops.All(h => h.Status == "ok");
        var resolved = intent != CopilotIntent.Unknown;

        return new AiCopilotResponseDto
        {
            Response = reply,
            SuggestedActions = actions,
            RecommendedModule = route,
            GeneratedContent = orchestration.Result,
            ConfidenceScore = healthy && resolved ? HealthyConfidence : DegradedConfidence,
        };
    }

    /// <summary>
    /// Writes the operator-facing reply. A degraded or empty route reports its
    /// own status — there is no module output to answer from, and inventing one
    /// would hide the failure. Otherwise the provider answers the original
    /// question using only what the modules produced.
    /// </summary>
    private async Task<string> BuildReplyAsync(
        AiCopilotRequestDto request,
        AiOrchestrationResponse orchestration,
        IReadOnlyList<string> actions,
        CancellationToken cancellationToken)
    {
        var degraded = orchestration.Hops.FirstOrDefault(h => h.Status == "degraded");

        if (degraded is not null)
            return $"The {degraded.Name} module could not complete this request: {degraded.Error}";

        var executed = orchestration.Hops
            .Where(h => h.Status == "ok")
            .Select(h => h.Name)
            .ToList();

        if (executed.Count == 0)
            return $"No AI module is available for the '{orchestration.RouteLabel}' request.";

        var prompt = BuildReplyPrompt(request, orchestration, actions);

        var reply = await _aiOrchestrator.GenerateTextAsync(
            prompt, SystemInstruction, ModuleName, cancellationToken);

        if (string.IsNullOrWhiteSpace(reply))
        {
            _logger.LogInformation(
                "AI Copilot: conversation {ConversationId} received no narrated reply — answering the operator's question directly.",
                request.ConversationId);

            // The module narration came back empty, so answer from the operator's
            // own prompt: it is passed through to the AI provider unchanged and
            // the provider's actual response is returned — never a canned
            // module-status placeholder.
            return (await _aiOrchestrator.GenerateTextAsync(
                request.UserMessage, SystemInstruction, ModuleName, cancellationToken)).Trim();
        }

        return reply.Trim();
    }

    /// <summary>
    /// Renders the operator's question plus the module results into a brief the
    /// provider can answer from. Only the already-projected actions are
    /// included, so the reply cannot reference anything the caller will not see.
    /// </summary>
    private static string BuildReplyPrompt(
        AiCopilotRequestDto request,
        AiOrchestrationResponse orchestration,
        IReadOnlyList<string> actions)
    {
        var sb = new StringBuilder();

        // Supplied by the workspace layer, which owns conversation memory. Kept
        // ahead of the question so a follow-up ("and the second one?") resolves.
        var history = ContextValue(request, "conversationHistory");
        if (!string.IsNullOrWhiteSpace(history))
        {
            sb.AppendLine("# Conversation So Far");
            sb.AppendLine();
            sb.AppendLine(history.Trim());
            sb.AppendLine();
        }

        sb.AppendLine("# Operator Question");
        sb.AppendLine();
        sb.AppendLine(request.UserMessage.Trim());
        sb.AppendLine();

        sb.AppendLine("# Module Results");
        sb.AppendLine();
        sb.AppendLine($"Task: {orchestration.RouteLabel}");
        sb.AppendLine();

        if (actions.Count > 0)
        {
            foreach (var action in actions)
            {
                sb.AppendLine($"- {action}");
            }
        }
        else
        {
            sb.AppendLine("_(The modules produced no items for this request.)_");
        }

        sb.AppendLine();

        return sb.ToString();
    }

    private static List<string> ExtractActions(AiOrchestrationResponse orchestration) =>
        orchestration.Result switch
        {
            CampaignResponseDto campaigns =>
                [.. campaigns.Campaigns.Take(MaxSuggestedActions).Select(c => c.Title)],

            ContentGenerationResponseDto content =>
                [.. content.Pieces.Take(MaxSuggestedActions).Select(p => p.Title)],

            FlipkartResponseDto flipkart =>
                [.. flipkart.Suggestions.Take(MaxSuggestedActions).Select(s => s.Title)],

            RecommendationCollection recommendations =>
                [.. Flatten(recommendations).Take(MaxSuggestedActions).Select(r => r.Reason)],

            string prompt when !string.IsNullOrWhiteSpace(prompt) => [prompt],

            _ => [],
        };

    private static IEnumerable<Recommendation> Flatten(RecommendationCollection collection) =>
        collection.Discount
            .Concat(collection.Bundle)
            .Concat(collection.Upsell)
            .Concat(collection.CrossSell)
            .Concat(collection.Clearance);
}
