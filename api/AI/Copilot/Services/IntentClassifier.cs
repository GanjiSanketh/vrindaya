using Vrindaya.Api.AI.Copilot.DTOs;
using Vrindaya.Api.AI.Copilot.Interfaces;
using Vrindaya.Api.AI.Copilot.Models;

namespace Vrindaya.Api.AI.Copilot.Services;

/// <summary>
/// Default <see cref="IIntentClassifier"/>. Scores the message against a fixed
/// keyword table and returns the highest scoring <see cref="CopilotIntent"/>.
/// Ties are broken by the declaration order of the table, which places the
/// narrower intents (specific content formats, Flipkart) ahead of the broader
/// ones (campaign, dashboard). Pure business logic — no AI provider, no
/// Firestore, no external calls.
/// </summary>
public sealed class IntentClassifier : IIntentClassifier
{
    /// <summary>
    /// Keyword table in priority order. A message scores one point per distinct
    /// matched keyword, so a message mentioning several terms for one intent
    /// outranks one that mentions a single term for another.
    /// </summary>
    private static readonly (CopilotIntent Intent, string[] Keywords)[] IntentKeywords =
    [
        (CopilotIntent.FlipkartListing,
            ["flipkart", "listing", "marketplace", "catalog", "catalogue", "compliance", "fsn", "seller portal"]),

        (CopilotIntent.Reel,
            ["reel", "reels", "short", "shorts", "video script", "reel script"]),

        (CopilotIntent.Carousel,
            ["carousel", "slides", "slide deck", "swipe post"]),

        (CopilotIntent.Instagram,
            ["instagram", "insta", "ig post", "caption", "hashtag", "hashtags", "story", "stories"]),

        (CopilotIntent.ProductIntelligence,
            ["product intelligence", "margin", "velocity", "stock health", "overstock", "dead stock", "restock", "inventory health", "sku performance"]),

        (CopilotIntent.Recommendation,
            ["recommend", "recommendation", "suggest", "discount", "bundle", "upsell", "cross-sell", "cross sell", "clearance", "what should i"]),

        (CopilotIntent.Analytics,
            ["analytics", "report", "trend", "trends", "conversion", "traffic", "click", "clicks", "growth", "compare", "insight", "insights"]),

        (CopilotIntent.Dashboard,
            ["dashboard", "summary", "overview", "snapshot", "kpi", "at a glance", "how is my business"]),

        (CopilotIntent.Campaign,
            ["campaign", "campaigns", "promotion", "promo", "offer", "sale", "festival", "diwali", "launch", "marketing", "ad", "ads"]),
    ];

    /// <summary>
    /// Fallback mapping from the operator's current workspace module. Used only
    /// when the message itself matches no keyword.
    /// </summary>
    private static readonly Dictionary<string, CopilotIntent> ModuleIntents = new(StringComparer.OrdinalIgnoreCase)
    {
        ["flipkart"] = CopilotIntent.FlipkartListing,
        ["campaigns"] = CopilotIntent.Campaign,
        ["campaign"] = CopilotIntent.Campaign,
        ["marketing"] = CopilotIntent.Campaign,
        ["content"] = CopilotIntent.Instagram,
        ["instagram"] = CopilotIntent.Instagram,
        ["products"] = CopilotIntent.ProductIntelligence,
        ["inventory"] = CopilotIntent.ProductIntelligence,
        ["recommendations"] = CopilotIntent.Recommendation,
        ["dashboard"] = CopilotIntent.Dashboard,
        ["analytics"] = CopilotIntent.Analytics,
    };

    public CopilotIntent Classify(string message)
    {
        if (string.IsNullOrWhiteSpace(message))
            return CopilotIntent.Unknown;

        var best = CopilotIntent.Unknown;
        var bestScore = 0;

        foreach (var (intent, keywords) in IntentKeywords)
        {
            var score = keywords.Count(k => ContainsKeyword(message, k));

            if (score > bestScore)
            {
                best = intent;
                bestScore = score;
            }
        }

        return best;
    }

    public CopilotIntent Classify(AiCopilotRequestDto request)
    {
        if (request is null)
            throw new ArgumentNullException(nameof(request));

        var intent = Classify(request.UserMessage);

        if (intent != CopilotIntent.Unknown)
            return intent;

        return !string.IsNullOrWhiteSpace(request.CurrentModule) &&
               ModuleIntents.TryGetValue(request.CurrentModule, out var moduleIntent)
            ? moduleIntent
            : CopilotIntent.Unknown;
    }

    /// <summary>
    /// Whole-word (or whole-phrase) containment check so "ad" does not match
    /// "already" and "sale" does not match "wholesale".
    /// </summary>
    private static bool ContainsKeyword(string message, string keyword)
    {
        var index = message.IndexOf(keyword, StringComparison.OrdinalIgnoreCase);

        while (index >= 0)
        {
            var startsCleanly = index == 0 || !char.IsLetterOrDigit(message[index - 1]);
            var end = index + keyword.Length;
            var endsCleanly = end == message.Length || !char.IsLetterOrDigit(message[end]);

            if (startsCleanly && endsCleanly)
                return true;

            index = message.IndexOf(keyword, index + 1, StringComparison.OrdinalIgnoreCase);
        }

        return false;
    }
}
