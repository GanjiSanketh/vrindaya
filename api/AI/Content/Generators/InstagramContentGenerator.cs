using Microsoft.Extensions.Logging;
using Vrindaya.Api.AI.Campaigns.Dtos;
using Vrindaya.Api.AI.Campaigns.Models;
using Vrindaya.Api.AI.Campaigns.Prompts;
using Vrindaya.Api.AI.Core.Interfaces;

namespace Vrindaya.Api.AI.Content.Generators;

/// <summary>
/// Generates Instagram-ready content (caption, hashtags, CTA, emoji suggestions)
/// for a campaign. The shared <see cref="IPromptBuilder"/> assembles the creative
/// brief and the core <see cref="IAiOrchestrator"/> executes it against the
/// configured provider, so the copy is real model output when Gemini is active.
///
/// Emoji suggestions stay a deterministic per-objective lookup: they are a brand
/// convention, not generated copy.
/// </summary>
public sealed class InstagramContentGenerator
{
    private static readonly IReadOnlyDictionary<CampaignObjective, IReadOnlyList<string>> EmojiSuggestions =
        new Dictionary<CampaignObjective, IReadOnlyList<string>>
        {
            [CampaignObjective.IncreaseSales] = new[] { "🔥", "🛍️", "🕶️" },
            [CampaignObjective.IncreaseFollowers] = new[] { "👥", "🌱", "📣" },
            [CampaignObjective.ClearInventory] = new[] { "🏷️", "⚡", "⏰" },
            [CampaignObjective.LaunchProduct] = new[] { "✨", "🎉", "🆕" },
            [CampaignObjective.FestivalPromotion] = new[] { "🪔", "🎊", "🎁" },
            [CampaignObjective.WebsiteTraffic] = new[] { "👀", "🔍", "🚀" },
            [CampaignObjective.BrandAwareness] = new[] { "💎", "🌸", "🤝" },
            [CampaignObjective.RepeatCustomers] = new[] { "💌", "🌟", "🫶" },
            [CampaignObjective.Upsell] = new[] { "👑", "💎", "💸" },
            [CampaignObjective.CrossSell] = new[] { "🧺", "🎯", "🛒" },
        };

    private readonly IPromptBuilder _promptBuilder;
    private readonly IAiOrchestrator _orchestrator;
    private readonly ILogger<InstagramContentGenerator> _logger;

    /// <summary>Telemetry label for prompts issued by this generator.</summary>
    private const string ModuleName = "content.instagram";

    /// <summary>Instruction pinning the model to the Instagram content contract.</summary>
    private const string SystemInstruction =
        "You write Instagram copy for Vrindaya, an Indian handmade ethnic apparel brand. " +
        "Reply with JSON only — no markdown, no commentary. " +
        "Use this exact shape: {\"caption\":string,\"hashtags\":[string],\"cta\":string}. " +
        "The caption is a single post-ready paragraph; give at most 8 hashtags, each starting with '#'; " +
        "the CTA is a short button-style phrase.";

    public InstagramContentGenerator(
        IPromptBuilder promptBuilder,
        IAiOrchestrator orchestrator,
        ILogger<InstagramContentGenerator> logger)
    {
        _promptBuilder = promptBuilder ?? throw new ArgumentNullException(nameof(promptBuilder));
        _orchestrator = orchestrator ?? throw new ArgumentNullException(nameof(orchestrator));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    /// <summary>
    /// Generates Instagram content for the supplied campaign request using the
    /// shared prompt builder and the configured AI provider.
    /// </summary>
    /// <param name="request">Campaign parameters driving the content.</param>
    /// <param name="cancellationToken">Optional cancellation token.</param>
    /// <returns>The generated Instagram content.</returns>
    /// <exception cref="ArgumentNullException">Thrown when <paramref name="request"/> is null.</exception>
    public async Task<InstagramContent> GenerateAsync(
        CampaignRequestDto request,
        CancellationToken cancellationToken = default)
    {
        if (request is null)
            throw new ArgumentNullException(nameof(request));

        var prompt = _promptBuilder.Build(request, null);

        _logger.LogInformation(
            "Instagram content generation starting — prompt built ({PromptLength} chars), routing to {Provider}.",
            prompt.Length, _orchestrator.ActiveProviderName);

        var generated = await _orchestrator.GenerateJsonAsync<InstagramCopy>(
            prompt, SystemInstruction, ModuleName, cancellationToken);

        var content = new InstagramContent
        {
            Caption = string.IsNullOrWhiteSpace(generated?.Caption)
                ? string.Empty
                : generated!.Caption!.Trim(),
            Hashtags = generated?.Hashtags?
                .Where(h => !string.IsNullOrWhiteSpace(h))
                .ToList() ?? new List<string>(),
            Cta = string.IsNullOrWhiteSpace(generated?.Cta)
                ? string.Empty
                : generated!.Cta!.Trim(),
            Emojis = ResolveEmojis(request.PreferredObjective).ToList(),
        };

        _logger.LogInformation(
            "Instagram content generation complete — {Hashtags} hashtags, {Emojis} emoji suggestions.",
            content.Hashtags.Count, content.Emojis.Count);

        return content;
    }

    /// <summary>Contract the model is asked to return.</summary>
    private sealed class InstagramCopy
    {
        public string? Caption { get; set; }

        public List<string>? Hashtags { get; set; }

        public string? Cta { get; set; }
    }

    private static IReadOnlyList<string> ResolveEmojis(CampaignObjective objective) =>
        EmojiSuggestions.TryGetValue(objective, out var emojis)
            ? emojis
            : EmojiSuggestions[CampaignObjective.IncreaseSales];
}