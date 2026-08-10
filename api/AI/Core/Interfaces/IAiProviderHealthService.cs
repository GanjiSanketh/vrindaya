using Vrindaya.Api.AI.Core.Models;

namespace Vrindaya.Api.AI.Core.Interfaces;

/// <summary>
/// Produces a strongly typed health report for the currently active AI provider
/// by composing the live provider selection (<see cref="IAiProviderSelector"/>)
/// with the rolling telemetry already collected by <see cref="IAiDiagnostics"/>.
///
/// This is a read-only, side-effect-free health view — it triggers no provider
/// call, mutates no state, and never exposes credentials or prompt text.
/// </summary>
public interface IAiProviderHealthService
{
    /// <summary>
    /// Returns the current health report for the active provider: which provider
    /// it is, its last successful request, failure count, success rate and
    /// average response time. Metrics cover only the active provider.
    /// </summary>
    AiProviderHealthReportDto GetReport();
}