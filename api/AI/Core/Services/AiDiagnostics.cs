using System.Collections.Concurrent;
using Microsoft.Extensions.Logging;
using Vrindaya.Api.AI.Core.Interfaces;
using Vrindaya.Api.AI.Core.Models;

namespace Vrindaya.Api.AI.Core.Services;

/// <summary>
/// Default <see cref="IAiDiagnostics"/>. Keeps a bounded, in-memory ring of the
/// most recent AI operations and derives the aggregate snapshot on demand.
///
/// Registered as a singleton so telemetry spans requests, and backed by a
/// <see cref="ConcurrentQueue{T}"/> with a hard cap so memory stays flat
/// regardless of traffic — this is diagnostics, not an audit log.
/// </summary>
public sealed class AiDiagnostics : IAiDiagnostics
{
    private readonly ILogger<AiDiagnostics> _logger;
    private readonly ConcurrentQueue<AiDiagnosticsEntry> _entries = new();

    /// <summary>Hard cap on retained entries; oldest are dropped first.</summary>
    private const int MaxRetainedEntries = 200;

    public AiDiagnostics(ILogger<AiDiagnostics> logger)
    {
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public void Record(AiDiagnosticsEntry entry)
    {
        if (entry is null)
        {
            return;
        }

        _entries.Enqueue(entry);

        while (_entries.Count > MaxRetainedEntries && _entries.TryDequeue(out _))
        {
            // Trim the oldest entries down to the cap.
        }

        if (entry.IsSuccess)
        {
            _logger.LogInformation(
                "AI diagnostics: {Operation} via {ProviderName}/{Model} succeeded in {ResponseTimeMs}ms " +
                "(cache hit: {CacheHit}, ~{TotalTokens} tokens).",
                entry.Operation, entry.ProviderName, entry.Model,
                entry.ResponseTimeMs, entry.CacheHit, entry.TotalTokens);
        }
        else
        {
            _logger.LogWarning(
                "AI diagnostics: {Operation} via {ProviderName}/{Model} failed after {ResponseTimeMs}ms " +
                "with status {Status}.",
                entry.Operation, entry.ProviderName, entry.Model,
                entry.ResponseTimeMs, entry.Status);
        }
    }

    public AiDiagnosticsSnapshot GetSnapshot(int maxRecentOperations = 20)
    {
        var entries = _entries.ToArray();

        if (entries.Length == 0)
        {
            return new AiDiagnosticsSnapshot();
        }

        var successCount = entries.Count(e => e.IsSuccess);
        var cacheHitCount = entries.Count(e => e.CacheHit);
        var take = Math.Clamp(maxRecentOperations, 1, entries.Length);

        return new AiDiagnosticsSnapshot
        {
            TotalOperations = entries.Length,
            SuccessCount = successCount,
            FailureCount = entries.Length - successCount,
            CacheHitCount = cacheHitCount,
            CacheHitRatePercent = Math.Round(cacheHitCount * 100d / entries.Length, 2),
            SuccessRatePercent = Math.Round(successCount * 100d / entries.Length, 2),
            AverageResponseTimeMs = Math.Round(entries.Average(e => e.ResponseTimeMs), 2),
            MaxResponseTimeMs = entries.Max(e => e.ResponseTimeMs),
            TotalTokens = entries.Sum(e => (long)e.TotalTokens),
            RecentOperations = entries
                .Reverse()
                .Take(take)
                .ToList(),
        };
    }

    public void Reset()
    {
        while (_entries.TryDequeue(out _))
        {
            // Drain.
        }

        _logger.LogInformation("AI diagnostics: telemetry reset.");
    }
}
