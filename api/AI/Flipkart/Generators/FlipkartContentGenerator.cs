using System.Text;
using Microsoft.Extensions.Logging;
using Vrindaya.Api.AI.Core.Interfaces;
using Vrindaya.Api.AI.Flipkart.DTOs;
using Vrindaya.Api.AI.Flipkart.Prompts;

namespace Vrindaya.Api.AI.Flipkart.Generators;

/// <summary>
/// Builds Flipkart-optimized listing content by sending the specialised prompts
/// authored by <see cref="IFlipkartPromptBuilder"/> through the core
/// <see cref="IAiOrchestrator"/>, so the copy is real model output when Gemini
/// is active.
///
/// Copy fields — description, bullets, backend keywords, meta description,
/// alt text, highlights and lifestyle copy — come from the model. Structural
/// fields stay deterministic and are never delegated: the listing title is a
/// fixed Flipkart attribute ordering, the search tags are kebab-cased
/// attributes, and the video prompt is a compliance-bound brief. Those are
/// rules, not creative writing.
///
/// Every prompt is issued in one round trip: the five component prompts are
/// composed into a single brief whose answer is a keyed JSON object, so a
/// listing costs one call rather than seven.
/// </summary>
public sealed class FlipkartContentGenerator : IFlipkartContentGenerator
{
    private const int MetaTitleMaxChars = 60;
    private const int MetaDescriptionMaxChars = 160;
    private const int AltTextMaxChars = 180;
    private const int LifestyleMaxChars = 300;

    /// <summary>Telemetry label for prompts issued by this generator.</summary>
    private const string ModuleName = "flipkart.listing";

    /// <summary>Instruction pinning the model to the listing-content contract.</summary>
    private const string SystemInstruction =
        "You are a Flipkart listing specialist for Vrindaya, an Indian handmade ethnic apparel brand. " +
        "Reply with JSON only — no markdown, no commentary. " +
        "Use this exact shape: {\"description\":string,\"bulletFeatures\":[string]," +
        "\"backendSearchKeywords\":string,\"metaDescription\":string,\"imageAltText\":string," +
        "\"productHighlights\":[string],\"lifestyleDescription\":string}. " +
        "Follow the per-section rules in the brief. backendSearchKeywords is a single comma-separated " +
        "string. Never include pricing, discounts or promotional claims, and never invent attributes " +
        "that were not supplied.";

    private readonly IFlipkartPromptBuilder _promptBuilder;
    private readonly IAiOrchestrator _aiOrchestrator;
    private readonly ILogger<FlipkartContentGenerator> _logger;

    public FlipkartContentGenerator(
        IFlipkartPromptBuilder promptBuilder,
        IAiOrchestrator aiOrchestrator,
        ILogger<FlipkartContentGenerator> logger)
    {
        _promptBuilder = promptBuilder ?? throw new ArgumentNullException(nameof(promptBuilder));
        _aiOrchestrator = aiOrchestrator ?? throw new ArgumentNullException(nameof(aiOrchestrator));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    /// <summary>
    /// Generates the listing content components from a structured request.
    /// </summary>
    public async Task<FlipkartContentResponse> GenerateContentAsync(
        FlipkartListingRequest request,
        CancellationToken cancellationToken = default)
    {
        if (request is null)
            throw new ArgumentNullException(nameof(request));

        cancellationToken.ThrowIfCancellationRequested();

        _logger.LogInformation(
            "FlipkartContentGenerator: authoring listing content for '{ProductName}' via {Provider}.",
            string.IsNullOrWhiteSpace(request.ProductName) ? "(unspecified)" : request.ProductName,
            _aiOrchestrator.ActiveProviderName);

        var brief = BuildBrief(request);

        var copy = await _aiOrchestrator.GenerateJsonAsync<FlipkartListingCopy>(
            brief, SystemInstruction, ModuleName, cancellationToken);

        var title = BuildFlipkartTitle(request);
        var description = Clean(copy?.Description);

        var content = new FlipkartContentResponse
        {
            Title = title,
            Description = description,
            BulletFeatures = CleanList(copy?.BulletFeatures),
            BackendSearchKeywords = Clean(copy?.BackendSearchKeywords),
            MetaTitle = Truncate(title, MetaTitleMaxChars),
            MetaDescription = Truncate(Clean(copy?.MetaDescription), MetaDescriptionMaxChars),
            ImageAltText = Truncate(Clean(copy?.ImageAltText), AltTextMaxChars),
            ProductHighlights = CleanList(copy?.ProductHighlights),
            LifestyleDescription = Truncate(Clean(copy?.LifestyleDescription), LifestyleMaxChars),
            FlipkartSearchTags = BuildFlipkartSearchTags(request),
            PackagingNotes = BuildPackagingNotes(request),
            VideoPrompt = BuildVideoPrompt(request),
        };

        _logger.LogInformation(
            "FlipkartContentGenerator: listing content generated for '{ProductName}' " +
            "(Description length: {DescLen}, Bullets: {BulletCount}, Keyword length: {KwcLen}, " +
            "Highlights: {HighlightCount}, Tags: {TagCount}).",
            request.ProductName,
            content.Description.Length,
            content.BulletFeatures.Count,
            content.BackendSearchKeywords.Length,
            content.ProductHighlights.Count,
            content.FlipkartSearchTags.Count);

        return content;
    }

    // -------------------------------------------------------------------
    // Prompt composition
    // -------------------------------------------------------------------

    /// <summary>
    /// Composes the five specialised prompts into one brief, each under the
    /// JSON field it must fill. The prompt bodies stay owned by
    /// <see cref="IFlipkartPromptBuilder"/>; this method only labels them.
    /// </summary>
    private string BuildBrief(FlipkartListingRequest request)
    {
        var sb = new StringBuilder();

        sb.AppendLine("# Flipkart Listing Brief");
        sb.AppendLine();
        sb.AppendLine("Produce every field below in a single JSON object.");
        sb.AppendLine();

        AppendSection(sb, "description", _promptBuilder.BuildProductDescriptionPrompt(request));
        AppendSection(sb, "bulletFeatures", _promptBuilder.BuildBulletFeaturesPrompt(request));
        AppendSection(sb, "backendSearchKeywords", _promptBuilder.BuildSearchKeywordsPrompt(request));
        AppendSection(sb, "metaDescription", _promptBuilder.BuildMetaDescriptionPrompt(request));

        // The SEO title prompt informs the alt text, highlights and lifestyle
        // copy: all three restate the same keyword-led positioning.
        AppendSection(sb, "imageAltText / productHighlights / lifestyleDescription",
            _promptBuilder.BuildSeoTitlePrompt(request));

        sb.AppendLine("## Field: imageAltText");
        sb.AppendLine();
        sb.AppendLine("One accessible sentence describing the hero image, under 180 characters.");
        sb.AppendLine();
        sb.AppendLine("## Field: productHighlights");
        sb.AppendLine();
        sb.AppendLine("3-6 short badge-style phrases, each under 8 words.");
        sb.AppendLine();
        sb.AppendLine("## Field: lifestyleDescription");
        sb.AppendLine();
        sb.AppendLine("One benefit-led lifestyle paragraph for gallery banners, under 300 characters.");
        sb.AppendLine();

        return sb.ToString();
    }

    private static void AppendSection(StringBuilder sb, string field, string prompt)
    {
        sb.AppendLine($"## Field: {field}");
        sb.AppendLine();
        sb.AppendLine(prompt.Trim());
        sb.AppendLine();
    }

    // -------------------------------------------------------------------
    // Deterministic structural fields
    // -------------------------------------------------------------------

    /// <summary>
    /// Builds the Flipkart-optimized listing title from structured attributes.
    /// Format: Brand + ProductName + Fabric + Color + Pattern + Fit + Neck + PackOf.
    /// This ordering is a marketplace rule, so it is composed here rather than
    /// delegated to the model.
    /// </summary>
    private static string BuildFlipkartTitle(FlipkartListingRequest request)
    {
        var parts = new List<string>();

        if (!string.IsNullOrWhiteSpace(request.Brand))
            parts.Add(request.Brand);
        if (!string.IsNullOrWhiteSpace(request.ProductName))
            parts.Add(request.ProductName);
        if (!string.IsNullOrWhiteSpace(request.Fabric))
            parts.Add(request.Fabric);
        if (!string.IsNullOrWhiteSpace(request.Color))
            parts.Add(request.Color);
        if (!string.IsNullOrWhiteSpace(request.Pattern))
            parts.Add(request.Pattern);
        if (!string.IsNullOrWhiteSpace(request.Fit))
            parts.Add(request.Fit);
        if (!string.IsNullOrWhiteSpace(request.Neck))
            parts.Add(request.Neck);
        if (request.PackOf > 1)
            parts.Add($"Pack Of {request.PackOf}");

        return string.Join(" ", parts).Trim();
    }

    /// <summary>
    /// Builds Flipkart search tags in kebab-case from the supplied attributes.
    /// A mechanical projection of known values — no generation involved.
    /// </summary>
    private static List<string> BuildFlipkartSearchTags(FlipkartListingRequest request)
    {
        var tags = new List<string>();

        if (!string.IsNullOrWhiteSpace(request.Brand))
            tags.Add(ToKebab(request.Brand));
        if (!string.IsNullOrWhiteSpace(request.Category))
            tags.Add(ToKebab(request.Category));
        if (!string.IsNullOrWhiteSpace(request.Fabric))
            tags.Add(ToKebab(request.Fabric));
        if (!string.IsNullOrWhiteSpace(request.Color))
            tags.Add(ToKebab(request.Color));
        if (!string.IsNullOrWhiteSpace(request.Pattern))
            tags.Add(ToKebab(request.Pattern));
        if (!string.IsNullOrWhiteSpace(request.Fit))
            tags.Add(ToKebab(request.Fit));
        if (!string.IsNullOrWhiteSpace(request.Occasion))
            tags.Add(ToKebab(request.Occasion));
        if (!string.IsNullOrWhiteSpace(request.Neck))
            tags.Add(ToKebab(request.Neck));
        if (request.PackOf > 1)
            tags.Add($"pack-of-{request.PackOf}");
        if (!string.IsNullOrWhiteSpace(request.ProductName))
            tags.Add(ToKebab(request.ProductName));

        foreach (var keyword in request.Keywords ?? [])
        {
            var text = ToKebab(keyword.TrimStart('#').Trim());
            if (!string.IsNullOrWhiteSpace(text))
                tags.Add(text);
        }

        // Deduplicate while preserving order.
        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        return tags.Where(t => !string.IsNullOrWhiteSpace(t) && seen.Add(t)).ToList();
    }

    /// <summary>
    /// Builds packaging and care notes. These are fulfilment and fabric-care
    /// facts, not marketing copy, so they stay attribute-derived.
    /// </summary>
    private static string BuildPackagingNotes(FlipkartListingRequest request)
    {
        var notes = new List<string>
        {
            "Carefully packaged in a reusable gift box with protective padding to ensure safe delivery.",
        };

        if (!string.IsNullOrWhiteSpace(request.Fabric))
        {
            var fabric = request.Fabric.ToLowerInvariant();

            notes.Add(fabric switch
            {
                var f when f.Contains("silk") =>
                    "Dry clean only; store folded in a muslin pouch away from direct sunlight.",
                var f when f.Contains("cotton") || f.Contains("linen") =>
                    "Machine wash cold on a gentle cycle; tumble dry low and iron on medium heat.",
                var f when f.Contains("wool") =>
                    "Hand wash in cold water with a mild detergent; dry flat in shade.",
                _ => "Gentle hand wash recommended; dry in shade to preserve colour and texture.",
            });
        }

        if (request.PackOf > 1)
            notes.Add($"Ships as a set of {request.PackOf} pieces in a single package.");

        return string.Join(" ", notes);
    }

    /// <summary>
    /// Builds a structured, Flipkart-compliant AI video-generation prompt
    /// (camera movement, lighting, background, model instructions, product
    /// focus, duration, Flipkart compliance) from the product attributes.
    /// Deterministic by design — this is a prompt, not generated copy.
    /// </summary>
    public string BuildVideoPrompt(FlipkartListingRequest request)
    {
        if (request is null)
            throw new ArgumentNullException(nameof(request));

        var productName = string.IsNullOrWhiteSpace(request.ProductName)
            ? "the product"
            : request.ProductName;

        var brandClause = string.IsNullOrWhiteSpace(request.Brand)
            ? string.Empty
            : $" by {request.Brand}";

        var colorClause = string.IsNullOrWhiteSpace(request.Color)
            ? "as shown"
            : $" in {request.Color}";

        var fabricClause = string.IsNullOrWhiteSpace(request.Fabric)
            ? string.Empty
            : $", highlighting the {request.Fabric} fabric";

        var pattern = string.IsNullOrWhiteSpace(request.Pattern)
            ? "design"
            : request.Pattern.ToLowerInvariant();

        var fit = string.IsNullOrWhiteSpace(request.Fit)
            ? "fit"
            : request.Fit.ToLowerInvariant();

        var neckDetail = string.IsNullOrWhiteSpace(request.Neck)
            ? string.Empty
            : $", featuring a {request.Neck.ToLowerInvariant()} neckline";

        var patternClause = string.IsNullOrWhiteSpace(request.Pattern)
            ? string.Empty
            : $" with its {request.Pattern.ToLowerInvariant()} pattern";

        var fitClause = string.IsNullOrWhiteSpace(request.Fit)
            ? string.Empty
            : $" and {request.Fit.ToLowerInvariant()} silhouette";

        var focusNeck = neckDetail.Length > 0
            ? neckDetail.Trim().TrimStart(',')
            : neckDetail;

        var lines = new[]
        {
            $"Create a 15-second cinematic product video for {productName}{brandClause}.",
            string.Empty,
            "Camera movement: Smooth cinematic dolly-in with a subtle parallax pan, starting with a wide establishing shot, gliding to a close-up of the fabric texture, then a gentle tilt-up to show the full garment — all motion slow and steady to keep the product heroic.",
            string.Empty,
            $"Lighting: Soft, diffused three-point lighting with warm golden-hour rim accents; shadows kept even and flattering so {colorClause} is true-to-life and {fabricClause} is clearly visible.",
            string.Empty,
            "Background: Clean, neutral matte backdrop in warm ivory with shallow depth of field (f/1.8); minimal props only — never competing with the product.",
            string.Empty,
            $"Model instructions: South Asian female model, mid-20s, natural minimal makeup, hair neatly styled; wearing {productName} — confident, graceful poses (standing, subtle three-quarter turn, light hand-on-hip gesture); modest styling, no revealing shots.",
            string.Empty,
            $"Product focus: {productName} stays center-frame throughout, tracked smoothly; emphasize the {pattern} detail, {colorClause} color, {fit} cut and {focusNeck}{patternClause}{fitClause}; ensure fabric drape and texture are visible in close-ups.",
            string.Empty,
            "Duration: 15 seconds at 30fps, optimized for Flipkart product-video placement — concise, scroll-stopping, no dead air.",
            string.Empty,
            "Flipkart compliance: no model faces fully shown (favor profile/side poses), modest styling, no overlay text or logos, product is the sole hero, 16:9 aspect ratio, MP4/h.264, under 30 seconds, no watermarks.",
        };

        return string.Join("\n", lines).Trim();
    }

    // -------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------

    private static string Clean(string? value) =>
        string.IsNullOrWhiteSpace(value) ? string.Empty : value!.Trim();

    private static List<string> CleanList(IEnumerable<string>? values) =>
        values?
            .Where(v => !string.IsNullOrWhiteSpace(v))
            .Select(v => v.Trim())
            .ToList() ?? [];

    /// <summary>
    /// Truncates a string to the specified maximum length, word-aware where possible.
    /// </summary>
    private static string Truncate(string value, int maxLength)
    {
        if (string.IsNullOrEmpty(value))
            return string.Empty;

        if (value.Length <= maxLength)
            return value;

        // Truncate at the last space before the limit for cleaner output.
        var truncated = value[..maxLength];
        var lastSpace = truncated.LastIndexOf(' ');
        return lastSpace > maxLength / 2
            ? truncated[..lastSpace].Trim()
            : truncated.Trim();
    }

    /// <summary>Converts a value to a kebab-cased search tag.</summary>
    private static string ToKebab(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return string.Empty;

        var parts = value
            .Split([' ', '_', '-'], StringSplitOptions.RemoveEmptyEntries)
            .Select(part => string.Concat(part.Where(char.IsLetterOrDigit)).ToLowerInvariant())
            .Where(p => p.Length > 0)
            .ToArray();

        return string.Join("-", parts);
    }

    /// <summary>Listing-copy contract the model is asked to return.</summary>
    private sealed class FlipkartListingCopy
    {
        public string? Description { get; set; }

        public List<string>? BulletFeatures { get; set; }

        public string? BackendSearchKeywords { get; set; }

        public string? MetaDescription { get; set; }

        public string? ImageAltText { get; set; }

        public List<string>? ProductHighlights { get; set; }

        public string? LifestyleDescription { get; set; }
    }
}
