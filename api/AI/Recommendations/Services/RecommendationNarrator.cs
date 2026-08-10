using System.Text;
using Microsoft.Extensions.Logging;
using Vrindaya.Api.AI.Core.Interfaces;
using Vrindaya.Api.AI.Recommendations.DTOs;
using Vrindaya.Api.AI.Recommendations.Models;

namespace Vrindaya.Api.AI.Recommendations.Services;

/// <summary>
/// Default <see cref="IRecommendationNarrator"/>. Builds one brief covering
/// every recommendation, routes it through the core <see cref="IAiOrchestrator"/>
/// and swaps in the model's explanation per recommendation.
///
/// Strictly narration: the recommendation set, its grouping, ordering,
/// confidence scores and ROI figures come from the deterministic engine and are
/// copied through untouched. Only <see cref="Recommendation.Reason"/> changes,
/// and only when the model supplied a non-empty replacement for that exact
/// product/type pair.
/// </summary>
public sealed class RecommendationNarrator : IRecommendationNarrator
{
    private readonly IAiOrchestrator _orchestrator;
    private readonly ILogger<RecommendationNarrator> _logger;

    /// <summary>Telemetry label for prompts issued by this narrator.</summary>
    private const string ModuleName = "recommendations";

    /// <summary>Instruction pinning the model to a reason-only contract.</summary>
    private const string SystemInstruction =
        "You explain merchandising recommendations to the owner of Vrindaya, an Indian handmade " +
        "ethnic apparel brand. Reply with JSON only — no markdown, no commentary. " +
        "Use this exact shape: {\"items\":[{\"key\":string,\"reason\":string}]}. " +
        "Reuse each 'key' exactly as given. Each reason is one or two plain sentences explaining why " +
        "the action is worth taking, grounded only in the metrics provided. " +
        "Do not invent numbers, do not change the recommended action, and do not add new items.";

    public RecommendationNarrator(
        IAiOrchestrator orchestrator,
        ILogger<RecommendationNarrator> logger)
    {
        _orchestrator = orchestrator ?? throw new ArgumentNullException(nameof(orchestrator));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public async Task<RecommendationCollection> NarrateAsync(
        RecommendationCollection collection,
        CancellationToken cancellationToken = default)
    {
        if (collection is null)
            throw new ArgumentNullException(nameof(collection));

        cancellationToken.ThrowIfCancellationRequested();

        var groups = new (RecommendationType Type, List<Recommendation> Items)[]
        {
            (RecommendationType.Discount, collection.Discount),
            (RecommendationType.Bundle, collection.Bundle),
            (RecommendationType.Upsell, collection.Upsell),
            (RecommendationType.CrossSell, collection.CrossSell),
            (RecommendationType.Clearance, collection.Clearance),
        };

        var all = groups.SelectMany(g => g.Items).ToList();

        if (all.Count == 0)
        {
            return collection;
        }

        var prompt = BuildPrompt(all);

        var narrated = await _orchestrator.GenerateJsonAsync<ReasonEnvelope>(
            prompt, SystemInstruction, ModuleName, cancellationToken);

        var byKey = BuildLookup(narrated);

        if (byKey.Count == 0)
        {
            _logger.LogInformation(
                "RecommendationNarrator: no model reasons available — keeping the engine's own explanations.");

            return collection;
        }

        var result = new RecommendationCollection
        {
            Discount = Apply(collection.Discount, byKey),
            Bundle = Apply(collection.Bundle, byKey),
            Upsell = Apply(collection.Upsell, byKey),
            CrossSell = Apply(collection.CrossSell, byKey),
            Clearance = Apply(collection.Clearance, byKey),
            GeneratedAt = collection.GeneratedAt,
        };

        _logger.LogInformation(
            "RecommendationNarrator narrated {Narrated}/{Total} recommendations via {Provider}.",
            byKey.Count,
            all.Count,
            _orchestrator.ActiveProviderName);

        return result;
    }

    /// <summary>
    /// Renders every recommendation as a keyed line carrying the metrics the
    /// engine already derived, so the model explains the decision rather than
    /// re-deciding it.
    /// </summary>
    private static string BuildPrompt(IReadOnlyList<Recommendation> recommendations)
    {
        var sb = new StringBuilder();

        sb.AppendLine("# Merchandising Recommendations");
        sb.AppendLine();
        sb.AppendLine("Explain each recommendation below to the store owner.");
        sb.AppendLine();

        foreach (var r in recommendations)
        {
            sb.AppendLine($"- key: `{KeyFor(r)}`");
            sb.AppendLine($"  - Action: {r.Type}");
            sb.AppendLine($"  - Product: {r.ProductName} ({r.Category})");
            sb.AppendLine($"  - Confidence: {r.ConfidenceScore:P0} | Expected ROI: {r.ExpectedROI:F2}x");
            sb.AppendLine($"  - Metrics: {r.Reason}");
            sb.AppendLine();
        }

        return sb.ToString();
    }

    /// <summary>
    /// Stable per-recommendation key. Type is part of it because one product can
    /// appear under several actions with a different justification each time.
    /// </summary>
    private static string KeyFor(Recommendation recommendation) =>
        $"{recommendation.Type}:{recommendation.ProductId}";

    private static Dictionary<string, string> BuildLookup(ReasonEnvelope? envelope)
    {
        var lookup = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);

        if (envelope?.Items is not { Count: > 0 })
        {
            return lookup;
        }

        foreach (var item in envelope.Items)
        {
            if (string.IsNullOrWhiteSpace(item.Key) || string.IsNullOrWhiteSpace(item.Reason))
            {
                continue;
            }

            lookup[item.Key!] = item.Reason!.Trim();
        }

        return lookup;
    }

    /// <summary>
    /// Rebuilds a group with narrated reasons. Every other field is copied
    /// verbatim, so the engine's numbers survive unchanged.
    /// </summary>
    private static List<Recommendation> Apply(
        List<Recommendation> source,
        IReadOnlyDictionary<string, string> byKey) =>
        source
            .Select(r => byKey.TryGetValue(KeyFor(r), out var reason)
                ? new Recommendation
                {
                    ProductId = r.ProductId,
                    ProductName = r.ProductName,
                    Category = r.Category,
                    Type = r.Type,
                    Reason = reason,
                    ConfidenceScore = r.ConfidenceScore,
                    ExpectedROI = r.ExpectedROI,
                }
                : r)
            .ToList();

    /// <summary>Reason-only contract the model is asked to return.</summary>
    private sealed class ReasonEnvelope
    {
        public List<ReasonItem>? Items { get; set; }
    }

    private sealed class ReasonItem
    {
        public string? Key { get; set; }

        public string? Reason { get; set; }
    }
}
