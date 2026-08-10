using Vrindaya.Api.AI.Flipkart.DTOs;
using Vrindaya.Api.Utilities;

namespace Vrindaya.Api.AI.Flipkart.Prompts;

/// <summary>
/// Deterministic Flipkart prompt builder. Generates SEO-optimized,
/// component-specific prompt guidance for each listing element by reusing
/// <see cref="PromptBuilder"/> and enriching it with Flipkart SEO constraints.
///
/// No AI providers are invoked — only prompt strings are authored.
/// </summary>
public sealed class FlipkartPromptBuilder : IFlipkartPromptBuilder
{
    // SEO title length cap enforced by Flipkart/best practice.
    private const int SeoTitleMaxChars = 80;

    // Backend search keyword limit on Flipkart.
    private const int SearchKeywordsMax = 200;

    // Meta description length cap for SEO.
    private const int MetaDescriptionMaxChars = 160;

    /// <summary>
    /// Builds a Flipkart SEO title prompt using the shared <see cref="PromptBuilder"/>.
    /// </summary>
    public string BuildSeoTitlePrompt(FlipkartListingRequest request)
    {
        if (request is null)
            throw new ArgumentNullException(nameof(request));

        var attributeFragment = BuildAttributeFragment(request);

        var prompt = PromptBuilder.BuildMarketingPrompt(
            product: request.ProductName,
            campaignGoal: "Generate a Flipkart SEO-optimized listing title",
            tone: "concise, branded, keyword-rich, mobile-friendly",
            theme: request.Category,
            audience: "Flipkart shoppers",
            platform: "Flipkart");

        return $"{prompt}\n\nFormatting rules:\n- Format: Brand + ProductName + [Fabric] + [Color] + [Pattern] + [Fit] + [Neck] + [PackOf] + key attributes.\n- Include: {attributeFragment.Trim()}\n- Maximum {SeoTitleMaxChars} characters.\n- Place the brand name first.\n- Prioritize high-volume search terms first.\n- Do NOT include pricing, offers, or promotional text.\n- Output ONLY the title, nothing else.";
    }

    /// <summary>
    /// Builds a Flipkart product description prompt using the shared <see cref="PromptBuilder"/>.
    /// </summary>
    public string BuildProductDescriptionPrompt(FlipkartListingRequest request)
    {
        if (request is null)
            throw new ArgumentNullException(nameof(request));

        var attributeFragment = BuildAttributeFragment(request);
        var featureBullets = request.Features.Any()
            ? string.Join(", ", request.Features)
            : "(derive from product attributes)";

        var prompt = PromptBuilder.BuildMarketingPrompt(
            product: request.ProductName,
            campaignGoal: "Write a detailed Flipkart product description",
            tone: "informative, benefit-driven, persuasive, well-structured",
            theme: request.Category,
            audience: "Flipkart shoppers",
            platform: "Flipkart");

        return $"{prompt}\n\nDescription requirements:\n- Product: {request.ProductName}\n- Key attributes: {attributeFragment.Trim()}\n- Feature highlights to weave in: {featureBullets}\n- Structure: Opening benefit hook → Fabric & Material → Fit & Comfort → Key Features → Occasion styling → Care instructions → Size & Fit note.\n- Length: 300–500 words.\n- Optimize for keyword: {request.ProductName} {request.Category}\n- Output ONLY the description, nothing else.";
    }

    /// <summary>
    /// Builds a Flipkart key-feature bullets prompt using the shared <see cref="PromptBuilder"/>.
    /// </summary>
    public string BuildBulletFeaturesPrompt(FlipkartListingRequest request)
    {
        if (request is null)
            throw new ArgumentNullException(nameof(request));

        var attributeFragment = BuildAttributeFragment(request);

        var prompt = PromptBuilder.BuildMarketingPrompt(
            product: request.ProductName,
            campaignGoal: "Generate scannable key feature bullet points",
            tone: "clear, benefit-focused, concise, customer-value oriented",
            theme: request.Category,
            audience: "Flipkart shoppers",
            platform: "Flipkart");

        return $"{prompt}\n\nBullet point guidelines:\n- Product: {request.ProductName}\n- Attributes: {attributeFragment.Trim()}\n- Output 5–8 bullet points, one per line, prefixed with •.\n- Each bullet: highlight a single USP (e.g. 'Premium {request.Fabric} fabric', 'Stylish {request.Pattern} pattern').\n- Use customer-facing benefit language, not just technical specs.\n- If Features are supplied, incorporate them as bullets; otherwise synthesize from attributes.\n- Output ONLY the bullet list, nothing else.";
    }

    /// <summary>
    /// Builds a Flipkart backend search keywords prompt using the shared <see cref="PromptBuilder"/>.
    /// </summary>
    public string BuildSearchKeywordsPrompt(FlipkartListingRequest request)
    {
        if (request is null)
            throw new ArgumentNullException(nameof(request));

        var keywordSeed = BuildKeywordSeed(request);
        var attributeFragment = BuildAttributeFragment(request);

        var prompt = PromptBuilder.BuildMarketingPrompt(
            product: request.ProductName,
            campaignGoal: "Generate Flipkart backend search keywords for discoverability",
            tone: "SEO-focused, comprehensive, search-term oriented",
            theme: request.Category,
            audience: "Flipkart search shoppers",
            platform: "Flipkart");

        return $"{prompt}\n\nSearch keyword rules:\n- Seed keywords: {keywordSeed}\n- Product: {request.ProductName}\n- Attributes: {attributeFragment.Trim()}\n- Generate up to {SearchKeywordsMax} characters of comma-separated keywords.\n- Include: brand, product type, fabric, color, pattern, occasion, fit, neck, target audience, use-case variations.\n- Add high-volume search synonyms for '{request.ProductName}'.\n- Avoid duplicates, pricing, or promotional terms.\n- Output ONLY a comma-separated keyword string, nothing else.";
    }

    /// <summary>
    /// Builds a Flipkart SEO meta description prompt using the shared <see cref="PromptBuilder"/>.
    /// </summary>
    public string BuildMetaDescriptionPrompt(FlipkartListingRequest request)
    {
        if (request is null)
            throw new ArgumentNullException(nameof(request));

        var attributeFragment = BuildAttributeFragment(request);
        var featureBullets = request.Features.Any()
            ? string.Join(", ", request.Features)
            : "(derived from attributes)";

        var prompt = PromptBuilder.BuildMarketingPrompt(
            product: request.ProductName,
            campaignGoal: "Write an SEO-optimized meta description for a Flipkart listing page",
            tone: "compelling, keyword-rich, click-through optimised, concise",
            theme: request.Category,
            audience: "Flipkart shoppers and search engines",
            platform: "Flipkart");

        return $"{prompt}\n\nMeta description requirements:\n- Product: {request.ProductName}\n- Attributes: {attributeFragment.Trim()}\n- Key features: {featureBullets}\n- Maximum {MetaDescriptionMaxChars} characters.\n- Begin with the brand and product name.\n- Include 1–2 power keywords naturally.\n- End with a call-to-action (e.g. 'Shop now', 'Discover your style').\n- Output ONLY the meta description, nothing else.";
    }

    // -------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------

    /// <summary>
    /// Assembles a human-readable fragment of non-empty product attributes for
    /// injection into each specialized prompt.
    /// </summary>
    private static string BuildAttributeFragment(FlipkartListingRequest request)
    {
        var parts = new List<string>();

        if (!string.IsNullOrWhiteSpace(request.Brand))
            parts.Add($"Brand={request.Brand}");
        if (!string.IsNullOrWhiteSpace(request.Category))
            parts.Add($"Category={request.Category}");
        if (!string.IsNullOrWhiteSpace(request.Fabric))
            parts.Add($"Fabric={request.Fabric}");
        if (!string.IsNullOrWhiteSpace(request.Color))
            parts.Add($"Color={request.Color}");
        if (!string.IsNullOrWhiteSpace(request.Pattern))
            parts.Add($"Pattern={request.Pattern}");
        if (!string.IsNullOrWhiteSpace(request.Sleeve))
            parts.Add($"Sleeve={request.Sleeve}");
        if (!string.IsNullOrWhiteSpace(request.Fit))
            parts.Add($"Fit={request.Fit}");
        if (!string.IsNullOrWhiteSpace(request.Neck))
            parts.Add($"Neck={request.Neck}");
        if (!string.IsNullOrWhiteSpace(request.Occasion))
            parts.Add($"Occasion={request.Occasion}");
        if (request.PackOf > 1)
            parts.Add($"PackOf={request.PackOf}");

        return string.Join(", ", parts);
    }

    /// <summary>
    /// Builds a comma-separated seed-keyword string for the search-keyword prompt,
    /// combining the supplied request keywords with derived attribute terms.
    /// </summary>
    private static string BuildKeywordSeed(FlipkartListingRequest request)
    {
        var keywords = new List<string>();

        if (request.Keywords is { Count: > 0 })
            keywords.AddRange(request.Keywords);

        if (!string.IsNullOrWhiteSpace(request.Brand))
            keywords.Add(request.Brand);
        if (!string.IsNullOrWhiteSpace(request.Category))
            keywords.Add(request.Category);
        if (!string.IsNullOrWhiteSpace(request.ProductName))
            keywords.Add(request.ProductName);
        if (!string.IsNullOrWhiteSpace(request.Fabric))
            keywords.Add(request.Fabric);
        if (!string.IsNullOrWhiteSpace(request.Color))
            keywords.Add(request.Color);
        if (!string.IsNullOrWhiteSpace(request.Pattern))
            keywords.Add(request.Pattern);
        if (!string.IsNullOrWhiteSpace(request.Fit))
            keywords.Add(request.Fit);
        if (!string.IsNullOrWhiteSpace(request.Occasion))
            keywords.Add(request.Occasion);
        if (!string.IsNullOrWhiteSpace(request.Neck))
            keywords.Add(request.Neck);
        if (request.PackOf > 1)
            keywords.Add($"Pack Of {request.PackOf}");

        return string.Join(", ", keywords.Where(k => !string.IsNullOrWhiteSpace(k)));
    }
}
