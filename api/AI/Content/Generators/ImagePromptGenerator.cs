using Microsoft.Extensions.Logging;
using Vrindaya.Api.AI.Campaigns.Models;

namespace Vrindaya.Api.AI.Content.Generators;

/// <summary>
/// Generates text-to-image prompts only (no image generation). Produces one
/// prompt per supported image model — ChatGPT Images, Midjourney, Flux and
/// Stable Diffusion — describing the same luxury fashion editorial scene of an
/// Indian model wearing the featured product.
/// </summary>
public sealed class ImagePromptGenerator
{
    /// <summary>Per-objective lighting, background, camera angle and styling direction.</summary>
    private sealed record SceneProfile(
        string Lighting,
        string Background,
        string FashionStyle);

    private static readonly IReadOnlyDictionary<CampaignObjective, SceneProfile> Profiles =
        new Dictionary<CampaignObjective, SceneProfile>
        {
            [CampaignObjective.IncreaseSales] = new(
                "warm golden window light with soft highlights",
                "a minimal luxury boutique interior with warm wood tones",
                "elevated ethnic editorial with a confident shopping mood"),
            [CampaignObjective.IncreaseFollowers] = new(
                "soft diffused daylight with gentle backlight",
                "a cozy airy white studio with a rattan accent chair",
                "approachable everyday luxury street-style editorial"),
            [CampaignObjective.ClearInventory] = new(
                "bright clean even lighting for crisp product details",
                "a neat minimal grey studio backdrop",
                "clean carryall styling with sharp color contrast"),
            [CampaignObjective.LaunchProduct] = new(
                "dramatic rim lighting against a spotlight halo",
                "a dark onyx studio with a single spotlight beam",
                "high-fashion launch editorial focusing on the outfit"),
            [CampaignObjective.FestivalPromotion] = new(
                "golden glow from hanging lights with candle flicker accents",
                "a festive interior with marigold garlands and brass lamps",
                "luxurious festive dressing with cultural accents"),
            [CampaignObjective.WebsiteTraffic] = new(
                "bright airy morning light with soft shadows",
                "a white contemporary gallery wall",
                "lifestyle editorial suited for web banners"),
            [CampaignObjective.BrandAwareness] = new(
                "warm diffused window light, calm and even",
                "a beige linen backdrop with artisan props",
                "understated luxury paying tribute to the craft"),
            [CampaignObjective.RepeatCustomers] = new(
                "warm cozy side light with a nostalgic tint",
                "a neutral warm studio with soft fabrics",
                "intimate wardrobe classic editorial"),
            [CampaignObjective.Upsell] = new(
                "moody low-key light with strong falloff",
                "a dark velvet backdrop with a single pool of light",
                "premium stripped-down luxury editorial"),
            [CampaignObjective.CrossSell] = new(
                "bright editorial light with slight warm cast",
                "a clean styling table with matching accessories",
                "complete-the-look editorial with layered accessories"),
        };

    private readonly ILogger<ImagePromptGenerator> _logger;

    public ImagePromptGenerator(ILogger<ImagePromptGenerator> logger)
    {
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    /// <summary>
    /// Builds the four platform-specific image prompts for the supplied
    /// objective and featured product. Pure prompt generation — no image is
    /// produced.
    /// </summary>
    /// <param name="objective">Campaign objective shaping the scene mood.</param>
    /// <param name="productName">The featured product to describe.</param>
    /// <returns>The platform-specific prompt set.</returns>
    public ImagePromptSet Generate(
        CampaignObjective objective,
        string productName = "our handcrafted ethnicity piece")
    {
        var profile = Profiles.TryGetValue(objective, out var p) ? p : Profiles[CampaignObjective.BrandAwareness];

        var lighting = profile.Lighting;
        var background = profile.Background;
        var fashionStyle = profile.FashionStyle;
        var lens = "85mm f/1.8 prime lens on a full-frame camera, shallow depth of field";
        var composition = "three-quarter centered composition with room for text overlay";
        var subject = $"elegant young Indian model wearing {productName}";

        var set = new ImagePromptSet
        {
            ChatGptImages =
                $"A luxury fashion editorial photograph of an {subject} in a {fashionStyle}. " +
                $"Lighting: {lighting}. Shot on {lens}. Composition: {composition}. " +
                $"Background: {background}. Refined premium aesthetic, photorealistic, highly detailed fabric textures.",
            Midjourney =
                $"editorial fashion photography of {subject}, {lighting}, {background}, " +
                $"{lens}, {composition}, {fashionStyle}, luxury aesthetic, premium fashion magazine, --ar 4:5 --style raw --v 6",
            Flux =
                $"A campaign editorial photograph of {subject}, {fashionStyle}. " +
                $"The scene uses {lighting}, shot on {lens} with a {composition}. {background}. " +
                $"Photorealistic luxury aesthetic, premium fashion catalog.",
            StableDiffusion =
                $"indian model, luxury editorial, {fashionStyle}, {productName}, {lighting}, {lens}, {composition}, " +
                $"{background}, photorealistic, ultra detailed, 8k, " +
                $"negative_prompt: blurry, lowres, deformed, watermark, ugly, extra hands",
        };

        _logger.LogInformation(
            "Image prompt generation complete for objective {Objective} — four prompts produced.",
            objective);

        return set;
    }
}