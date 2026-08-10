using Vrindaya.Api.AI.Core.Models;

namespace Vrindaya.Api.AI.Core.Interfaces;

/// <summary>
/// Records AI usage telemetry — requests, provider, module, execution time and
/// estimated tokens, plus success/failure — and exposes a rolling aggregate.
///
/// Recording is intentionally side-effect free with respect to business logic:
/// it never alters a response, never throws into the caller's path and never
/// stores prompt text. Usage is kept in memory only (no persistence), bounded
/// so memory stays flat regardless of traffic.
/// </summary>
public interface IAiUsageService
{
    /// <summary>Records a completed AI usage entry.</summary>
    void Record(AiUsageEntry entry);

    /// <summary>
    /// Returns a rolling aggregate over the usage entries recorded so far.
    /// </summary>
    /// <param name="maxRecentEntries">How many recent entries to include, newest first.</param>
    AiUsageSummary GetSummary(int maxRecentEntries = 20);

    /// <summary>Discards all recorded usage entries.</summary>
    void Reset();
}
