using System.Collections.Concurrent;
using Microsoft.Extensions.Logging;
using Vrindaya.Api.AI.Core.Configuration;
using Vrindaya.Api.AI.Core.Interfaces;
using Vrindaya.Api.AI.Core.Models;

namespace Vrindaya.Api.AI.Core.Services;

/// <summary>
/// Default <see cref="IAiUsageService"/>. Keeps a bounded, in-memory ring of the
/// most recent AI usage entries and derives the aggregate summary on demand.
///
/// Registered as a singleton so usage spans requests, and backed by a
/// <see cref="ConcurrentQueue{T}"/> with a hard cap so memory stays flat
/// regardless of traffic — this is usage accounting, not an audit log.
/// </summary>
public sealed class AiUsageService : IAiUsageService
{
    private readonly ILogger<AiUsageService> _logger;
    private readonly ConcurrentQueue<AiUsageEntry> _entries = new();

    /// <summary>Hard cap on retained entries; oldest are dropped first.</summary>
    private const int MaxRetainedEntries = 500;

    public AiUsageService(ILogger<AiUsageService> logger)
    {
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public void Record(AiUsageEntry entry)
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
                "AI usage: {Module} request {RequestId} via {ProviderName}/{Model} succeeded in {ExecutionTimeMs}ms " +
                "(~{EstimatedTokens} tokens, estimated: {TokensEstimated}).",
                entry.Module, entry.RequestId, entry.ProviderName, entry.Model,
                entry.ExecutionTimeMs, entry.EstimatedTokens, entry.TokensEstimated);
        }
        else
        {
            _logger.LogWarning(
                "AI usage: {Module} request {RequestId} via {ProviderName}/{Model} failed after {ExecutionTimeMs}ms " +
                "with status {Status}.",
                entry.Module, entry.RequestId, entry.ProviderName, entry.Model,
                entry.ExecutionTimeMs, entry.Status);
        }
    }

    public AiUsageSummary GetSummary(int maxRecentEntries = 20)
    {
        var entries = _entries.ToArray();

        if (entries.Length == 0)
        {
            return new AiUsageSummary();
        }

        var successCount = entries.Count(e => e.IsSuccess);
        var failureCount = entries.Length - successCount;
        var take = Math.Clamp(maxRecentEntries, 1, entries.Length);

        var perProvider = entries
            .GroupBy(e => e.Provider)
            .ToDictionary(g => g.Key, g => g.Count());

        var perModule = entries
            .GroupBy(e => e.Module)
            .Where(g => !string.IsNullOrEmpty(g.Key))
            .ToDictionary(g => g.Key, g => g.Count());

        return new AiUsageSummary
        {
            TotalRequests = entries.Length,
            SuccessCount = successCount,
            FailureCount = failureCount,
            SuccessRatePercent = Math.Round(successCount * 100d / entries.Length, 2),
            AverageExecutionTimeMs = Math.Round(entries.Average(e => e.ExecutionTimeMs), 2),
            MaxExecutionTimeMs = entries.Max(e => e.ExecutionTimeMs),
            TotalEstimatedTokens = entries.Sum(e => (long)e.EstimatedTokens),
            RequestsPerProvider = perProvider,
            RequestsPerModule = perModule,
            Recent = entries
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

        _logger.LogInformation("AI usage: telemetry reset.");
    }
}
