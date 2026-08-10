using Vrindaya.Api.AI.Campaigns.Dtos;
using Vrindaya.Api.AI.Campaigns.Models;
using Vrindaya.Api.AI.Core.Interfaces;
using Vrindaya.Api.AI.Core.Templates;

namespace Vrindaya.Api.AI.Campaigns.Prompts;

/// <summary>
/// Converts a list of <see cref="CampaignSuggestionDto"/> plus the originating
/// <see cref="CampaignRequestDto"/> into a single, optimized LLM prompt string.
/// Pure transformation — no AI calls. Prompt assembly is delegated to the shared
/// <see cref="IPromptTemplateService"/>, which renders the
/// <see cref="PromptTemplateKind.Campaign"/> template, so the brief layout lives
/// in the enriched <c>Campaign.prompt.txt</c> resource and this builder only owns
/// the dynamic value computation that the original inline builder performed.
/// </summary>
public sealed class PromptBuilder : IPromptBuilder
{
    private readonly IPromptTemplateService _promptTemplateService;

    public PromptBuilder(IPromptTemplateService promptTemplateService)
    {
        _promptTemplateService = promptTemplateService ?? throw new ArgumentNullException(nameof(promptTemplateService));
    }

    /// <summary>
    /// Builds a single LLM prompt from the campaign suggestions and request context
    /// by rendering the <see cref="PromptTemplateKind.Campaign"/> template with a
    /// map of computed values. Every value-computation rule (goal text, products
    /// listing, audience defaulting, platform selection, tone, budget) is preserved
    /// verbatim from the original inline builder; only the assembly of those
    /// values into the final prompt body is delegated to the template renderer.
    /// </summary>
    /// <param name="request">The original request driving the suggestions (objective, audience, platform, etc.).</param>
    /// <param name="suggestions">Ranked campaign suggestions produced by the scoring engine.</param>
    /// <param name="budget">Optional budget hint injected into the prompt.</param>
    /// <returns>A single string prompt ready to send to an LLM.</returns>
    public string Build(CampaignRequestDto? request, IReadOnlyList<CampaignSuggestionDto>? suggestions, decimal budget = 0m)
    {
        var objective = request?.PreferredObjective ?? CampaignObjective.IncreaseSales;

        var values = new Dictionary<string, string>
        {
            ["goal"] = ObjectiveToGoal(objective, request?.FestivalName),
            ["products"] = BuildProductsSection(suggestions),
            ["audience"] = string.IsNullOrWhiteSpace(request?.TargetAudience) ? "General" : request!.TargetAudience,
            ["platform"] = BuildPlatformSection(request?.Platform),
            ["tone"] = ToneForObjective(objective),
            ["budget"] = budget > 0
                ? $"Total budget for this campaign cycle: **{budget:C}**."
                : "_(No specific budget provided — use discretion.)_",
        };

        return _promptTemplateService.Render(PromptTemplateKind.Campaign, values);
    }

    // -------------------------------------------------------------------
    // Section value computation (business logic preserved verbatim)
    // -------------------------------------------------------------------

    /// <summary>
    /// Renders the ranked product suggestions into a brief, scannable listing.
    /// </summary>
    private static string BuildProductsSection(IReadOnlyList<CampaignSuggestionDto>? suggestions)
    {
        if (suggestions is { Count: > 0 })
        {
            var blocks = new List<string>(suggestions.Count);

            foreach (var s in suggestions)
            {
                blocks.Add(string.Join("\n",
                    $"- **Product**: {s.ProductName} ({s.Category})",
                    $"  - Product ID: `{s.ProductId}`",
                    $"  - Suggested Title: {s.Title}",
                    $"  - Score: {s.Score}/100 | Priority: {s.Priority} | Confidence: {s.Confidence:P0}",
                    $"  - Expected ROI: {s.ExpectedRoi:F2}x | Estimated Revenue: {s.EstimatedRevenue:N0}",
                    $"  - Rationale: {s.Rationale}"));
            }

            return string.Join("\n\n", blocks);
        }

        return "_(No product suggestions available.)_";
    }

    /// <summary>
    /// Resolves the platform line(s): the requested platform when one is
    /// explicitly chosen, otherwise the default multi-channel spread.
    /// </summary>
    private static string BuildPlatformSection(MarketingPlatform? platform)
    {
        if (platform.HasValue && platform.Value != MarketingPlatform.MultiPlatform)
            return $"- {platform.Value}";

        return string.Join("\n",
            "- Instagram (primary)",
            "- Facebook (secondary)",
            "- Email newsletter",
            "- Website banners");
    }

    private static string ObjectiveToGoal(CampaignObjective objective, string? festivalName)
    {
        var festival = string.IsNullOrWhiteSpace(festivalName) ? string.Empty : $" during **{festivalName}**";

        return objective switch
        {
            CampaignObjective.IncreaseSales => $"Primary goal is to **increase sales** over the next campaign period{festival}.",
            CampaignObjective.IncreaseFollowers => $"Primary goal is to **grow the follower count** across selected platforms{festival}.",
            CampaignObjective.ClearInventory => $"Primary goal is to **clear existing inventory** to free up stock{festival}.",
            CampaignObjective.LaunchProduct => $"Primary goal is to **successfully launch** the featured product(s){festival}.",
            CampaignObjective.FestivalPromotion => $"Primary goal is to **maximize festival-themed promotions**{festival}.",
            CampaignObjective.WebsiteTraffic => $"Primary goal is to **drive targeted traffic** to the product pages{festival}.",
            CampaignObjective.BrandAwareness => $"Primary goal is to **increase brand awareness** and recall{festival}.",
            CampaignObjective.RepeatCustomers => $"Primary goal is to **win back repeat customers** through retention campaigns{festival}.",
            CampaignObjective.Upsell => $"Primary goal is to **upsell higher-tier products** to existing customers{festival}.",
            CampaignObjective.CrossSell => $"Primary goal is to **cross-sell complementary products** alongside the featured item{festival}.",
            _ => $"Primary goal is to **boost marketing performance**{festival}.",
        };
    }

    private static string ToneForObjective(CampaignObjective objective)
    {
        return objective switch
        {
            CampaignObjective.IncreaseSales => "Energetic, persuasive, and value-focused — emphasize savings and urgency.",
            CampaignObjective.IncreaseFollowers => "Engaging, community-oriented, and inviting — foster connection and belonging.",
            CampaignObjective.ClearInventory => "Urgent, benefit-driven, and transactional — highlight clearance savings.",
            CampaignObjective.LaunchProduct => "Exciting, discovery-focused, and aspirational — tease features and benefits.",
            CampaignObjective.FestivalPromotion => "Festive, celebratory, and culturally resonant — tap into seasonal joy.",
            CampaignObjective.WebsiteTraffic => "Curious, click-worthy, and informative — tease exclusive content.",
            CampaignObjective.BrandAwareness => "Trust-building, authoritative, and memorable — reinforce brand identity.",
            CampaignObjective.RepeatCustomers => "Warm, appreciative, and rewarding — celebrate loyalty and offer perks.",
            CampaignObjective.Upsell => "Sophisticated, aspirational, and exclusive — appeal to premium desires.",
            CampaignObjective.CrossSell => "Helpful, holistic, and lifestyle-oriented — present complete solutions.",
            _ => "Friendly, professional, and clear.",
        };
    }
}
