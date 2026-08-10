using Vrindaya.Api.AI.Orchestrator.Models;

namespace Vrindaya.Api.AI.Orchestrator.Interfaces;

/// <summary>
/// A registered unit of AI capability the orchestrator can route to. Each
/// implementation wraps an existing downstream module (campaign generator,
/// recommendation engine, prompt builder) and exposes execution through a
/// uniform contract.
/// </summary>
public interface IAiModule
{
    AiModuleKey Key { get; }

    string Name { get; }

    string Role { get; }

    /// <summary>
    /// Executes this module hop for the current orchestration run.
    /// </summary>
    /// <param name="context">Shared run state — read inputs, write outputs.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The module output (also written to <paramref name="context"/> for downstream hops).</returns>
    Task<object?> ExecuteAsync(AiOrchestrationContext context, CancellationToken cancellationToken);
}