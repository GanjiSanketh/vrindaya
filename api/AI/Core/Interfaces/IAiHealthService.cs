using Vrindaya.Api.AI.Core.Models;

namespace Vrindaya.Api.AI.Core.Interfaces;

/// <summary>
/// Top-level AI subsystem health monitor. Produces an in-memory, read-only
/// health snapshot that answers, at a glance, whether the provider is usable,
/// which provider is active, whether mock mode is in effect, and how the recent
/// request telemetry (success/failure, latency) looks.
///
/// The monitor triggers no provider call, mutates no state, persists nothing and
/// never exposes credentials — provider availability is a boolean presence check
/// derived from local configuration only.
/// </summary>
public interface IAiHealthService
{
    /// <summary>
    /// Returns the current AI subsystem health snapshot. Safe to poll: the
    /// snapshot is computed entirely from in-memory telemetry and local
    /// configuration, with no external request.
    /// </summary>
    AiHealthReportDto GetHealthReport();
}
