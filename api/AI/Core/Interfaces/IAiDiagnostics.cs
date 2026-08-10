using Vrindaya.Api.AI.Core.Models;

namespace Vrindaya.Api.AI.Core.Interfaces;

/// <summary>
/// Collects per-operation AI telemetry — response time, provider, model, cache
/// hit, token estimate and success/failure — and exposes a rolling snapshot.
///
/// Recording is intentionally side-effect free with respect to business logic:
/// it never alters a response, never throws into the caller's path and never
/// stores prompt text. No controller surfaces this; the snapshot exists for
/// logging and health tooling.
/// </summary>
public interface IAiDiagnostics
{
    /// <summary>Records a completed AI operation.</summary>
    void Record(AiDiagnosticsEntry entry);

    /// <summary>
    /// Returns a rolling aggregate over the operations recorded so far.
    /// </summary>
    /// <param name="maxRecentOperations">How many recent entries to include, newest first.</param>
    AiDiagnosticsSnapshot GetSnapshot(int maxRecentOperations = 20);

    /// <summary>Discards all recorded telemetry.</summary>
    void Reset();
}
