using System.Diagnostics;
using Microsoft.Extensions.Logging;
using Vrindaya.Api.AI.Orchestrator.Interfaces;
using Vrindaya.Api.AI.Orchestrator.Models;

namespace Vrindaya.Api.AI.Orchestrator.Services;

/// <summary>
/// Default <see cref="IAiOrchestrator"/>. Routes a request through the module
/// registry as a hub-and-spoke flow: the named route is resolved in the route
/// table, each hop is executed in path order over the registered modules, and
/// every hop is timed and recorded. A missing module is skipped; a failing
/// module is marked degraded and does not stop the remaining hops.
/// </summary>
public sealed class AiOrchestrator : IAiOrchestrator
{
    private readonly IReadOnlyDictionary<AiModuleKey, IAiModule> _modules;
    private readonly IReadOnlyDictionary<string, AiOrchestrationRoute> _routes;
    private readonly ILogger<AiOrchestrator> _logger;

    public AiOrchestrator(IEnumerable<IAiModule> modules, ILogger<AiOrchestrator> logger)
    {
        _modules = (modules ?? throw new ArgumentNullException(nameof(modules)))
            .ToDictionary(m => m.Key);
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        _routes = AiRouteCatalog.Routes.ToDictionary(r => r.Key, StringComparer.OrdinalIgnoreCase);
    }

    public IReadOnlyList<AiOrchestrationRoute> GetRoutes() => AiRouteCatalog.Routes;

    public async Task<AiOrchestrationResponse> ExecuteAsync(
        AiOrchestratorRequest request,
        CancellationToken cancellationToken = default)
    {
        if (request is null)
            throw new ArgumentNullException(nameof(request));

        if (string.IsNullOrWhiteSpace(request.Route))
            throw new ArgumentException("A route must be specified.", nameof(request));

        if (!_routes.TryGetValue(request.Route, out var route))
            throw new ArgumentException($"Unknown orchestration route '{request.Route}'.", nameof(request));

        var requestId = string.IsNullOrWhiteSpace(request.RequestId)
            ? $"REQ-{Guid.NewGuid():N}"[..16]
            : request.RequestId;

        var context = new AiOrchestrationContext(request);
        var hops = new List<AiOrchestrationHop>(route.Path.Count);
        var sw = Stopwatch.StartNew();

        _logger.LogInformation(
            "AI Orchestrator: request {RequestId} accepted, route '{Route}' ({Count} hops).",
            requestId, route.Key, route.Path.Count);

        foreach (var key in route.Path)
        {
            hops.Add(await ExecuteHopAsync(context, key, requestId, cancellationToken));
        }

        sw.Stop();

        var status = hops.Count != 0 && hops.All(h => h.Status == "ok")
            ? "200 OK"
            : $"200 OK ({Summarize(hops)})";

        _logger.LogInformation(
            "AI Orchestrator: request {RequestId} completed — {Status} in {DurationMs}ms.",
            requestId, status, sw.ElapsedMilliseconds);

        return new AiOrchestrationResponse
        {
            RequestId = requestId,
            Route = route.Key,
            RouteLabel = route.Label,
            Hops = hops,
            DurationMs = sw.ElapsedMilliseconds,
            Status = status,
            Timestamp = DateTime.UtcNow,
            Result = hops.Count > 0 ? hops[^1].Output : null,
        };
    }

    private async Task<AiOrchestrationHop> ExecuteHopAsync(
        AiOrchestrationContext context,
        AiModuleKey key,
        string requestId,
        CancellationToken cancellationToken)
    {
        if (!_modules.TryGetValue(key, out var module))
        {
            _logger.LogWarning(
                "AI Orchestrator: request {RequestId} — hop {Module} skipped: no registered implementation.",
                requestId, key);

            return new AiOrchestrationHop
            {
                Key = key,
                Name = Enum.GetName(key) ?? key.ToString(),
                Role = "Unregistered module",
                Status = "skipped",
                DurationMs = 0,
            };
        }

        var hopSw = Stopwatch.StartNew();
        try
        {
            var output = await module.ExecuteAsync(context, cancellationToken);
            hopSw.Stop();

            _logger.LogInformation(
                "AI Orchestrator: request {RequestId} — hop {Module} completed in {DurationMs}ms.",
                requestId, module.Name, hopSw.ElapsedMilliseconds);

            return new AiOrchestrationHop
            {
                Key = key,
                Name = module.Name,
                Role = module.Role,
                Status = "ok",
                DurationMs = hopSw.ElapsedMilliseconds,
                OutputType = output?.GetType().Name,
                Output = output,
            };
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception ex)
        {
            hopSw.Stop();

            _logger.LogError(ex,
                "AI Orchestrator: request {RequestId} — hop {Module} failed in {DurationMs}ms.",
                requestId, module.Name, hopSw.ElapsedMilliseconds);

            return new AiOrchestrationHop
            {
                Key = key,
                Name = module.Name,
                Role = module.Role,
                Status = "degraded",
                DurationMs = hopSw.ElapsedMilliseconds,
                Error = ex.Message,
            };
        }
    }

    private static string Summarize(IReadOnlyList<AiOrchestrationHop> hops)
    {
        var ok = hops.Count(h => h.Status == "ok");
        var skipped = hops.Count(h => h.Status == "skipped");
        var degraded = hops.Count(h => h.Status == "degraded");
        return $"{ok} ok, {skipped} skipped, {degraded} degraded";
    }
}