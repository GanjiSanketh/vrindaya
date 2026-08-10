using Microsoft.Extensions.Logging;
using Vrindaya.Api.AI.Flipkart.DTOs;
using Vrindaya.Api.AI.Flipkart.Generators;
using Vrindaya.Api.AI.Flipkart.Interfaces;

namespace Vrindaya.Api.AI.Flipkart.Services;

/// <summary>
/// Produces a Flipkart-compliant listing (title, description, key features,
/// search keywords, SEO metadata, video prompt) from structured product
/// attributes.
///
/// The listing content itself is authored by
/// <see cref="IFlipkartContentGenerator"/>, which sends the specialised
/// Flipkart prompts through the core AI orchestrator — so the copy is real
/// model output when Gemini is the configured provider. This service owns only
/// the projection from the generator's content bundle onto the public
/// <see cref="FlipkartListingResponse"/> contract, plus the attribute-derived
/// fallbacks used when a copy field comes back empty.
/// </summary>
public sealed class FlipkartListingService : IFlipkartListingService
{
    private const int MetaTitleMaxChars = 60;
    private const int MetaDescriptionMaxChars = 160;

    private readonly IFlipkartContentGenerator _contentGenerator;
    private readonly ILogger<FlipkartListingService> _logger;

    public FlipkartListingService(
        IFlipkartContentGenerator contentGenerator,
        ILogger<FlipkartListingService> logger)
    {
        _contentGenerator = contentGenerator ?? throw new ArgumentNullException(nameof(contentGenerator));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    /// <summary>
    /// Generates a Flipkart-compliant product listing from the supplied request.
    /// </summary>
    public async Task<FlipkartListingResponse> GenerateListingAsync(
        FlipkartListingRequest request,
        CancellationToken cancellationToken = default)
    {
        if (request is null)
            throw new ArgumentNullException(nameof(request));

        cancellationToken.ThrowIfCancellationRequested();

        _logger.LogInformation(
            "FlipkartListingService: building listing for '{ProductName}' (Brand: {Brand}, Category: {Category}).",
            request.ProductName,
            string.IsNullOrWhiteSpace(request.Brand) ? "(unspecified)" : request.Brand,
            string.IsNullOrWhiteSpace(request.Category) ? "(unspecified)" : request.Category);

        var content = await _contentGenerator.GenerateContentAsync(request, cancellationToken);

        var response = MapToListingResponse(request, content);

        _logger.LogInformation(
            "FlipkartListingService: listing generated for '{ProductName}' — " +
            "{FeatureCount} key feature(s), {KeywordCount} search keyword(s), " +
            "video prompt generated ({VideoPromptLen} chars).",
            request.ProductName,
            response.KeyFeatures.Count,
            response.SearchKeywords.Count,
            response.VideoPrompt.Length);

        return response;
    }

    // -------------------------------------------------------------------
    // Response mapping
    // -------------------------------------------------------------------

    private static FlipkartListingResponse MapToListingResponse(
        FlipkartListingRequest request,
        FlipkartContentResponse content)
    {
        var title = string.IsNullOrWhiteSpace(content.Title)
            ? BuildListingTitle(request)
            : content.Title;

        var description = content.Description;

        var keyFeatures = content.BulletFeatures is { Count: > 0 }
            ? content.BulletFeatures
            : BuildKeyFeatures(request);

        var searchKeywords = SplitKeywords(content.BackendSearchKeywords);
        if (searchKeywords.Count == 0)
            searchKeywords = BuildSearchKeywords(request);

        return new FlipkartListingResponse
        {
            Title = title,
            Description = description,
            KeyFeatures = keyFeatures,
            SearchKeywords = searchKeywords,
            MetaTitle = string.IsNullOrWhiteSpace(content.MetaTitle)
                ? Truncate(title, MetaTitleMaxChars)
                : content.MetaTitle,
            MetaDescription = string.IsNullOrWhiteSpace(content.MetaDescription)
                ? Truncate(description, MetaDescriptionMaxChars)
                : content.MetaDescription,
            VideoPrompt = content.VideoPrompt,
        };
    }

    /// <summary>
    /// Splits the generator's comma-separated backend keyword string into the
    /// list shape this response exposes, de-duplicated and order-preserving.
    /// </summary>
    private static List<string> SplitKeywords(string keywords)
    {
        if (string.IsNullOrWhiteSpace(keywords))
            return [];

        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        return keywords
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Where(k => k.Length > 0 && seen.Add(k))
            .ToList();
    }

    /// <summary>
    /// Flipkart's fixed title ordering, used when the content bundle carries no
    /// title: Brand + Product + Fabric + Color + Pattern + Fit + Neck + Pack.
    /// </summary>
    private static string BuildListingTitle(FlipkartListingRequest request)
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
    /// Attribute-derived key features, used only when neither the model nor the
    /// request supplied any.
    /// </summary>
    private static List<string> BuildKeyFeatures(FlipkartListingRequest request)
    {
        if (request.Features is { Count: > 0 })
            return [.. request.Features];

        var features = new List<string>();

        if (!string.IsNullOrWhiteSpace(request.Fabric))
            features.Add($"{request.Fabric} fabric");
        if (!string.IsNullOrWhiteSpace(request.Color))
            features.Add($"Available in {request.Color}");
        if (!string.IsNullOrWhiteSpace(request.Pattern))
            features.Add($"{request.Pattern} pattern");
        if (!string.IsNullOrWhiteSpace(request.Fit))
            features.Add($"{request.Fit} fit");
        if (!string.IsNullOrWhiteSpace(request.Occasion))
            features.Add($"Suitable for {request.Occasion}");

        return features;
    }

    /// <summary>
    /// Attribute-derived search keywords, used only when the model returned
    /// none.
    /// </summary>
    private static List<string> BuildSearchKeywords(FlipkartListingRequest request)
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
        if (!string.IsNullOrWhiteSpace(request.Occasion))
            keywords.Add(request.Occasion);
        if (!string.IsNullOrWhiteSpace(request.Pattern))
            keywords.Add(request.Pattern);
        if (request.PackOf > 1)
            keywords.Add($"Pack Of {request.PackOf}");

        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        return keywords
            .Where(k => !string.IsNullOrWhiteSpace(k) && seen.Add(k))
            .ToList();
    }

    private static string Truncate(string value, int maxLength)
    {
        if (string.IsNullOrEmpty(value))
            return string.Empty;

        return value.Length <= maxLength
            ? value
            : value[..maxLength].Trim();
    }
}
