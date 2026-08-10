using Microsoft.Extensions.Logging;
using Vrindaya.Api.AI.Campaigns.Dtos;
using Vrindaya.Api.AI.Campaigns.Models;
using Vrindaya.Api.AI.Core.Interfaces;
using Vrindaya.Api.AI.Core.Models;

namespace Vrindaya.Api.AI.Core.Providers;

/// <summary>
/// Mock implementation of <see cref="IAiProvider"/>. Returns realistic,
/// deterministic marketing content — Instagram captions, reel scripts,
/// carousel slide copy, hashtags and CTAs — without calling any external
/// API (no OpenAI, no Gemini, no Claude). Useful for development and testing.
/// </summary>
public sealed class MockAiProvider : IAiProvider
{
    private readonly ILogger<MockAiProvider> _logger;

    private const int MaxMockCampaigns = 8;

    private static readonly string[] BaseProducts =
    {
        "Silk Saree",
        "Handloom Dupatta",
        "Silver Jhumka Set",
        "Embroidered Lehenga",
    };

    /// <summary>Rich copy bundle describing one campaign, per objective.</summary>
    private sealed record ContentBundle(
        string TitlePrefix,
        string Caption,
        string ReelScript,
        IReadOnlyList<string> CarouselSlides,
        IReadOnlyList<string> Hashtags,
        string Cta);

    private static readonly IReadOnlyDictionary<CampaignObjective, ContentBundle> MockTemplates =
        new Dictionary<CampaignObjective, ContentBundle>
        {
            [CampaignObjective.IncreaseSales] = new(
                "Limited-Time Offer",
                "Save up to 30% on our most-loved pieces — including {product}. " +
                "Handmade with love and priced to move. Tap through and claim yours before the drop ends. 💫",
                "Hook: Your wardrobe called — it's ready for an upgrade. " +
                "Body: meet {product}, crafted for the everyday and the unforgettable. " +
                "CTA: tap the link to shop the edit now.",
                new[]
                {
                    "Slide 1 — Hero: 'The {product} everyone keeps reposting.'",
                    "Slide 2 — Details: hand-finished prints and premium fabric close-ups.",
                    "Slide 3 — Style: two ways to wear {product} this week.",
                    "Slide 4 — Offer: up to 30% off, limited stock.",
                    "Slide 5 — CTA card: 'Shop Now' — link in bio.",
                },
                new[] { "#VrindayaStyle", "#FestiveEdit", "#HandmadeInIndia", "#ShopNow", "#IndianFashion" },
                "Shop Now"),

            [CampaignObjective.IncreaseFollowers] = new(
                "Grow The Community",
                "Join 50K+ members of the Vrindaya family. Follow for daily styling inspiration, exclusive drops and member-only perks. Welcome home. 🏡",
                "Hook: 'You're one tap away from 50K happy hearts.' " +
                "Body: daily style ideas, festival edits and behind-the-seams stories. " +
                "CTA: follow us and be first in line for the next drop.",
                new[]
                {
                    "Slide 1 — Welcome: 'Meet the Vrindaya family.'",
                    "Slide 2 — What you'll see daily on this page.",
                    "Slide 3 — Member perks: exclusive drops + first access.",
                    "Slide 4 — Call to action: smash follow for a surprise reel tomorrow.",
                },
                new[] { "#JoinTheFamily", "#VrindayaStyle", "#FollowForDailyStyle", "#EthnicInspo" },
                "Follow Us"),

            [CampaignObjective.ClearInventory] = new(
                "End-Of-Season Clearance",
                "Final reductions are live! Up to 50% off selected styles, including {product}, while stock lasts. " +
                "Once it's gone, it's gone — refresh your wishlist today. 🧡",
                "Hook: '50% off — no joke, no catch.' " +
                "Body: end-of-season clearance to clear way for the new collection. " +
                "CTA: grab the last sizes before the clock hits zero.",
                new[]
                {
                    "Slide 1 — Announcement: clearance week has begun.",
                    "Slide 2 — Picks under ₹999 fly.",
                    "Slide 3 — Promotional strip: one-time-only reductions.",
                    "Slide 4 — Final call: 'Last few sizes remaining.'",
                },
                new[] { "#ClearanceSale", "#LastChance", "#BigSavings", "#VrindayaDeals" },
                "Grab Yours"),

            [CampaignObjective.LaunchProduct] = new(
                "New Arrival Alert",
                "Fresh drop alert! Meet {product} — the newest piece to hit the shelves. " +
                "Be the first to own it, share it and style it like a pro. 🎉",
                "Hook: 'It's finally here.' " +
                "Body: unveil {product} with a slow-mo reveal and styling demo. " +
                "CTA: comment 'MINE' to grab early access.",
                new[]
                {
                    "Slide 1 — Reveal: 'Something new is here.'",
                    "Slide 2 — First look at {product} up close.",
                    "Slide 3 — Styled looks: office, festive, brunch.",
                    "Slide 4 — Launch-day exclusive: 10% off first 100 orders.",
                },
                new[] { "#NewArrival", "#JustLaunched", "#VrindayaDrops", "#FirstAccess" },
                "Claim Access"),

            [CampaignObjective.FestivalPromotion] = new(
                "Festive Special Edit",
                "Sparkle through the festival with our festive edit — {product} and more, with gift wrapping and free shipping. Festive magic, doorstep-delivered. 🪔",
                "Hook: 'Festival forever, gatekeeping never.' " +
                "Body: festive fits, gift-ready packaging, doorstep joy. " +
                "CTA: shop the festive edit and make it a celebration.",
                new[]
                {
                    "Slide 1 — The festive edit is here.",
                    "Slide 2 — Gifting: complimentary wrapping on orders.",
                    "Slide 3 — The lookbook: silk, shimmer, sparkle.",
                    "Slide 4 — Offer strip: free shipping this week only.",
                },
                new[] { "#FestiveSpecial", "#FestivalEdit", "#VrindayaMagic", "#FestiveShopping" },
                "Shop The Edit"),

            [CampaignObjective.WebsiteTraffic] = new(
                "Just Dropped — Visit The Site",
                "Sneak peek of what's coming — the new selection drops this Friday. " +
                "Save the date, turn on notifications and head to the site. All the pics live there. 👀",
                "Hook: 'Something gorgeous is landing.' " +
                "Body: teaser of the new arrival, curated picks on-site. " +
                "CTA: head to the website to be first to shop.",
                new[]
                {
                    "Slide 1 — Teaser: silhouette of what's next.",
                    "Slide 2 — Drop date + time countdown.",
                    "Slide 3 — Hint: 'Handmade, every single piece.'",
                    "Slide 4 — CTA: visit the website now.",
                },
                new[] { "#UpcomingDrop", "#TeaserCollect", "#JustDropped", "#VrindayaStyle" },
                "See It First"),

            [CampaignObjective.BrandAwareness] = new(
                "The Story Behind The Craft",
                "Every piece has a story — of looms, hands and decades of craft. " +
                "Meet the artisans behind {product} and the craft that is Vrindaya. 🌸",
                "Hook: 'You've seen the product; now meet the makers.' " +
                "Body: journey from loom to your wardrobe. " +
                "CTA: save and share to celebrate handmade India.",
                new[]
                {
                    "Slide 1 — The hands that made it.",
                    "Slide 2 — The loom, the technique, the time.",
                    "Slide 3 — Stories from our artisan partners.",
                    "Slide 4 — Be part of the movement: shop the craft.",
                },
                new[] { "#CraftStory", "#MadeWithLoveIndia", "#VrindayaStory", "#ArtisanMade" },
                "Know More"),

            [CampaignObjective.RepeatCustomers] = new(
                "Welcome Back, VIP",
                "It's good to see you again! Enjoy 20% off your next order with code 'IMBACK20'. " +
                "We saved the best of {product} just for you. 💌",
                "Hook: 'We noticed you've been away.' " +
                "Body: a personal warm welcome with the pair-exclusive code. " +
                "CTA: apply IMBACK20 at checkout.",
                new[]
                {
                    "Slide 1 — 'We missed you!'",
                    "Slide 2 — Your member-only offer: 20% off.",
                    "Slide 3 — Fresh picks inspired by your last order.",
                    "Slide 4 — Expires soon — use code IMBACK20.",
                },
                new[] { "#WelcomeBack", "#MemberPerks", "#ThankYouQueue", "#VrindayaRewards" },
                "Claim 20% Off"),

            [CampaignObjective.Upsell] = new(
                "Elevate Your Look",
                "Love what you bought? Complete the moment with premium pairings — " +
                "elevate {product} with our exclusive finishing pieces. Just for you. ✨",
                "Hook: 'You have the piece. Now meet its other half.' " +
                "Body: show premium add-ons styled with {product}. " +
                "CTA: tap to build the complete look.",
                new[]
                {
                    "Slide 1 — 'Complete the look.'",
                    "Slide 2 — The premium upgrade — is why for you.",
                    "Slide 3 — Before/after: with and without accessories.",
                    "Slide 4 — Bundle pricing: out any, add everything.",
                },
                new[] { "#CompleteTheLook", "#Upsell", "#PremiumPairing", "#VrindayaUpgrade" },
                "Upgrade Now"),

            [CampaignObjective.CrossSell] = new(
                "Complete The Look",
                "Your {product} + the perfect finishing touches = a head-turner ensemble. " +
                "Discover handpicked matches for every outfit. 🎁",
                "Hook: 'Every hero outfit deserves a side to steal the show.' " +
                "Body: matching accessories and add-ons to the basket. " +
                "CTA: bundle and save at checkout.",
                new[]
                {
                    "Slide 1 — You'll love it with…",
                    "Slide 2 — Match 1: jewel tone pairings.",
                    "Slide 3 — Match 2: the everyday pair.",
                    "Slide 4 — Savings on bundles right now.",
                },
                new[] { "#CompleteTheLook", "#StylingIdeas", "#ShopTheHoot", "#VrindayaBundles" },
                "Add To The Carousel"),
        };

    public MockAiProvider(ILogger<MockAiProvider> logger)
    {
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public string ProviderName => "MockAiProvider";

    public bool IsMock => true;

    public Task<CampaignResponseDto> GenerateAsync(
        CampaignRequestDto request,
        CancellationToken cancellationToken = default)
    {
        if (request is null)
            throw new ArgumentNullException(nameof(request));

        cancellationToken.ThrowIfCancellationRequested();

        var content = ResolveBundle(request.PreferredObjective);
        var campaigns = new List<CampaignSuggestionDto>(request.MaximumCampaigns);

        for (var i = 0; i < request.MaximumCampaigns && i < MaxMockCampaigns; i++)
        {
            campaigns.Add(CreateSuggestion(request, i, content));
        }

        _logger.LogInformation(
            "MockAiProvider generated {TotalCampaigns} campaigns for objective {Objective}.",
            campaigns.Count, request.PreferredObjective);

        return Task.FromResult(new CampaignResponseDto
        {
            Campaigns = campaigns,
            GeneratedAt = DateTime.UtcNow,
            TotalProductsAnalyzed = campaigns.Count,
            TotalCampaigns = campaigns.Count,
        });
    }

    public Task<AiSummaryResponse> SummarizeAsync(
        CampaignResponseDto source,
        CancellationToken cancellationToken = default)
    {
        if (source is null)
            throw new ArgumentNullException(nameof(source));

        cancellationToken.ThrowIfCancellationRequested();

        var titles = source.Campaigns
            .Select(c => c.Title)
            .Where(t => !string.IsNullOrWhiteSpace(t))
            .Take(3)
            .ToList();

        var suffix = source.TotalCampaigns == 1 ? string.Empty : "s";
        var summary = titles.Count > 0
            ? $"Generated {source.TotalCampaigns} campaign{suffix} today: {string.Join(", ", titles)}."
            : $"Generated {source.TotalCampaigns} campaign{suffix} today.";

        _logger.LogInformation(
            "MockAiProvider summarized {Total} campaign{s}.",
            source.TotalCampaigns,
            source.TotalCampaigns == 1 ? string.Empty : "s");

        return Task.FromResult(new AiSummaryResponse
        {
            Summary = summary,
            TotalItems = source.TotalCampaigns,
            GeneratedAt = DateTime.UtcNow,
        });
    }

    public Task<AiProviderHealthStatus> HealthCheckAsync(CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();

        // Mock provider is always "healthy" — no external round-trip involved.
        return Task.FromResult(new AiProviderHealthStatus
        {
            IsHealthy = true,
            Status = "OK",
            LatencyMs = 12,
            Timestamp = DateTime.UtcNow,
        });
    }

    /// <summary>
    /// Deterministic stand-in for a free-form generation. The mock provider
    /// cannot author copy for an arbitrary prompt, so it echoes a clearly
    /// labelled placeholder rather than inventing text that could be mistaken
    /// for model output. Callers that need real copy select the Gemini provider.
    /// </summary>
    public Task<string> GenerateTextAsync(
        string prompt,
        string? systemInstruction = null,
        string? responseMimeType = null,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(prompt))
            throw new ArgumentException("Prompt must not be empty.", nameof(prompt));

        cancellationToken.ThrowIfCancellationRequested();

        _logger.LogInformation(
            "MockAiProvider served a {Length}-character prompt without calling an external API.",
            prompt.Length);

        // JSON was requested: an empty object keeps the caller's deserialization
        // path valid, and its emptiness makes the caller fall back deliberately.
        return Task.FromResult(responseMimeType == "application/json" ? "{}" : string.Empty);
    }

    private static CampaignSuggestionDto CreateSuggestion(
        CampaignRequestDto request,
        int index,
        ContentBundle content)
    {
        var productName = BaseProducts[index % BaseProducts.Length];

        return new CampaignSuggestionDto
        {
            ProductId = $"mock-{index + 1:00}",
            ProductName = productName,
            Category = "Ethnic Apparel",
            Title = $"{content.TitlePrefix}: {productName}",
            Objective = request.PreferredObjective,
            Rationale = $"Feature {productName} to {GoalVerb(request.PreferredObjective)} — matches the current objective, platform and audience.",
            Score = 92,
            Priority = CampaignPriority.High,
            Confidence = 0.84,
            ExpectedRoi = 3.2,
            EstimatedRevenue = 45_000,
            InstagramCaption = content.Caption.Replace("{product}", productName),
            ReelScript = content.ReelScript.Replace("{product}", productName),
            CarouselSlides = content.CarouselSlides.Select(s => s.Replace("{product}", productName)).ToList(),
            Hashtags = content.Hashtags.ToList(),
            Cta = content.Cta,
        };
    }

    private static ContentBundle ResolveBundle(CampaignObjective objective) =>
        MockTemplates.TryGetValue(objective, out var bundle)
            ? bundle
            : MockTemplates[CampaignObjective.IncreaseSales];

    private static string GoalVerb(CampaignObjective objective) =>
        objective switch
        {
            CampaignObjective.IncreaseSales => "boost sales",
            CampaignObjective.IncreaseFollowers => "grow the audience",
            CampaignObjective.ClearInventory => "clear left-over inventory",
            CampaignObjective.LaunchProduct => "launch a new product",
            CampaignObjective.FestivalPromotion => "festival promotion",
            CampaignObjective.WebsiteTraffic => "drive website traffic",
            CampaignObjective.BrandAwareness => "raise brand awareness",
            CampaignObjective.RepeatCustomers => "win back repeat customers",
            CampaignObjective.Upsell => "upsell premium options",
            CampaignObjective.CrossSell => "cross-sell complementary pieces",
            _ => "improve marketing performance",
        };
}