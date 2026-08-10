using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Logging;
using Vrindaya.Api.AI.Campaigns.Dtos;
using Vrindaya.Api.AI.Campaigns.Models;
using Vrindaya.Api.AI.ContentGeneration.DTOs;
using Vrindaya.Api.AI.Flipkart.DTOs;

namespace Vrindaya.Api.AI.Core.Providers.Gemini;

/// <summary>
/// Default <see cref="IGeminiResponseParser"/>. Converts the JSON text a Gemini
/// candidate carries into the existing module DTOs — no new contracts are
/// introduced, and no HTTP concern lives here (the round trip belongs to
/// <see cref="GeminiPromptExecutor"/>).
///
/// The parser is deliberately forgiving, because LLM output drifts:
/// <list type="bullet">
///   <item>markdown code fences around the JSON are stripped;</item>
///   <item>leading/trailing prose around the JSON object is trimmed away;</item>
///   <item>a bare array is accepted where an object with a collection is expected;</item>
///   <item>numbers arriving as strings, comments and trailing commas are tolerated;</item>
///   <item>enum members are matched case-insensitively.</item>
/// </list>
///
/// Every method is total: unusable input produces <c>null</c>, never an
/// exception, so each caller keeps its own deterministic fallback.
/// </summary>
public sealed class GeminiResponseParser : IGeminiResponseParser
{
    private readonly ILogger<GeminiResponseParser> _logger;

    /// <summary>
    /// Shared deserialization settings. Case-insensitive names and string enums
    /// match the loose casing LLMs produce; the numeric/comment/comma
    /// allowances absorb the rest of the usual drift.
    /// </summary>
    private static readonly JsonSerializerOptions ParseOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        NumberHandling = JsonNumberHandling.AllowReadingFromString,
        ReadCommentHandling = JsonCommentHandling.Skip,
        AllowTrailingCommas = true,
        Converters = { new JsonStringEnumConverter(allowIntegerValues: true) },
    };

    public GeminiResponseParser(ILogger<GeminiResponseParser> logger)
    {
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public CampaignResponseDto? ParseCampaigns(string? text)
    {
        var response = Deserialize<CampaignResponseDto>(text, nameof(CampaignResponseDto));

        // Tolerate a bare array of suggestions in place of the wrapper object.
        if (response is null or { Campaigns.Count: 0 })
        {
            var suggestions = Deserialize<List<CampaignSuggestionDto>>(text, nameof(CampaignSuggestionDto));
            if (suggestions is { Count: > 0 })
            {
                response = new CampaignResponseDto { Campaigns = suggestions };
            }
        }

        if (response is null or { Campaigns.Count: 0 })
        {
            return null;
        }

        foreach (var campaign in response.Campaigns)
        {
            NormalizeCampaign(campaign);
        }

        // Contract guarantee: suggestions are ordered by score descending.
        response.Campaigns = response.Campaigns
            .OrderByDescending(c => c.Score)
            .ToList();

        response.GeneratedAt = response.GeneratedAt == default ? DateTime.UtcNow : response.GeneratedAt;
        response.TotalCampaigns = response.Campaigns.Count;
        response.TotalProductsAnalyzed = response.TotalProductsAnalyzed > 0
            ? response.TotalProductsAnalyzed
            : response.Campaigns.Count;

        _logger.LogDebug(
            "GeminiResponseParser: parsed {Total} campaign suggestion(s).", response.TotalCampaigns);

        return response;
    }

    public ContentGenerationResponseDto? ParseContent(string? text)
    {
        var response = Deserialize<ContentGenerationResponseDto>(text, nameof(ContentGenerationResponseDto));

        if (response is null or { Pieces.Count: 0 })
        {
            var pieces = Deserialize<List<ContentPieceDto>>(text, nameof(ContentPieceDto));
            if (pieces is { Count: > 0 })
            {
                response = new ContentGenerationResponseDto { Pieces = pieces };
            }
        }

        if (response is null or { Pieces.Count: 0 })
        {
            return null;
        }

        foreach (var piece in response.Pieces)
        {
            NormalizeContentPiece(piece);
        }

        response.Pieces = response.Pieces
            .OrderByDescending(p => p.Score)
            .ToList();

        response.GeneratedAt = response.GeneratedAt == default ? DateTime.UtcNow : response.GeneratedAt;
        response.TotalPieces = response.Pieces.Count;
        response.TotalProductsAnalyzed = response.TotalProductsAnalyzed > 0
            ? response.TotalProductsAnalyzed
            : response.Pieces.Count;

        _logger.LogDebug(
            "GeminiResponseParser: parsed {Total} content piece(s).", response.TotalPieces);

        return response;
    }

    public FlipkartResponseDto? ParseFlipkart(string? text)
    {
        var response = Deserialize<FlipkartResponseDto>(text, nameof(FlipkartResponseDto));

        if (response is null or { Suggestions.Count: 0 })
        {
            var suggestions = Deserialize<List<FlipkartSuggestionDto>>(text, nameof(FlipkartSuggestionDto));
            if (suggestions is { Count: > 0 })
            {
                response = new FlipkartResponseDto { Suggestions = suggestions };
            }
        }

        if (response is null or { Suggestions.Count: 0 })
        {
            return null;
        }

        foreach (var suggestion in response.Suggestions)
        {
            NormalizeFlipkartSuggestion(suggestion);
        }

        // Priority is an ascending-severity enum (Critical = 1) — order by it directly.
        response.Suggestions = response.Suggestions
            .OrderBy(s => s.Priority)
            .ThenByDescending(s => s.Confidence)
            .ToList();

        response.TotalSuggestions = response.Suggestions.Count;
        response.GeneratedAt = response.GeneratedAt == default ? DateTime.UtcNow : response.GeneratedAt;
        response.ConfidenceScore = response.ConfidenceScore > 0
            ? Clamp(response.ConfidenceScore, 0, 100)
            : (int)Math.Round(response.Suggestions.Average(s => s.Confidence));

        _logger.LogDebug(
            "GeminiResponseParser: parsed {Total} Flipkart suggestion(s).", response.TotalSuggestions);

        return response;
    }

    public FlipkartListingResponse? ParseFlipkartListing(string? text)
    {
        var listing = Deserialize<FlipkartListingResponse>(text, nameof(FlipkartListingResponse));

        // A listing without a title carries no usable value for the caller.
        if (listing is null || string.IsNullOrWhiteSpace(listing.Title))
        {
            return null;
        }

        listing.Title = listing.Title.Trim();
        listing.Description = listing.Description?.Trim() ?? string.Empty;
        listing.MetaTitle = listing.MetaTitle?.Trim() ?? string.Empty;
        listing.MetaDescription = listing.MetaDescription?.Trim() ?? string.Empty;
        listing.VideoPrompt = listing.VideoPrompt?.Trim() ?? string.Empty;
        listing.KeyFeatures = CleanList(listing.KeyFeatures);
        listing.SearchKeywords = CleanList(listing.SearchKeywords);

        _logger.LogDebug(
            "GeminiResponseParser: parsed a Flipkart listing with {Features} key feature(s).",
            listing.KeyFeatures.Count);

        return listing;
    }

    /// <summary>
    /// Deserializes <typeparamref name="TValue"/> from raw model text, after
    /// stripping any markdown fence and surrounding prose. Returns <c>null</c>
    /// instead of throwing when the payload does not match.
    /// </summary>
    private TValue? Deserialize<TValue>(string? text, string contractName)
        where TValue : class
    {
        if (string.IsNullOrWhiteSpace(text))
        {
            return null;
        }

        var json = ExtractJson(text!);

        if (string.IsNullOrWhiteSpace(json))
        {
            return null;
        }

        try
        {
            return JsonSerializer.Deserialize<TValue>(json, ParseOptions);
        }
        catch (JsonException ex)
        {
            _logger.LogDebug(ex,
                "GeminiResponseParser: payload did not match the {Contract} contract.", contractName);

            return null;
        }
        catch (NotSupportedException ex)
        {
            _logger.LogDebug(ex,
                "GeminiResponseParser: payload could not be mapped onto {Contract}.", contractName);

            return null;
        }
    }

    /// <summary>
    /// Isolates the JSON document inside raw model text: removes a surrounding
    /// markdown code fence, then trims any prose before the first and after the
    /// last brace/bracket.
    /// </summary>
    private static string ExtractJson(string text)
    {
        var trimmed = StripCodeFence(text);

        var firstObject = trimmed.IndexOf('{');
        var firstArray = trimmed.IndexOf('[');

        var start = firstObject < 0
            ? firstArray
            : firstArray < 0 ? firstObject : Math.Min(firstObject, firstArray);

        if (start < 0)
        {
            return string.Empty;
        }

        var closing = trimmed[start] == '{' ? '}' : ']';
        var end = trimmed.LastIndexOf(closing);

        return end > start ? trimmed[start..(end + 1)] : trimmed[start..];
    }

    /// <summary>Removes a leading/trailing markdown code fence, when present.</summary>
    private static string StripCodeFence(string text)
    {
        var trimmed = text.Trim();

        if (!trimmed.StartsWith("```", StringComparison.Ordinal))
        {
            return trimmed;
        }

        var firstBreak = trimmed.IndexOf('\n');
        if (firstBreak < 0)
        {
            return trimmed;
        }

        var body = trimmed[(firstBreak + 1)..];
        var lastFence = body.LastIndexOf("```", StringComparison.Ordinal);

        return (lastFence >= 0 ? body[..lastFence] : body).Trim();
    }

    /// <summary>
    /// Clamps the numeric fields of a campaign suggestion into their documented
    /// ranges and derives the priority when the model omitted a sane one.
    /// </summary>
    private static void NormalizeCampaign(CampaignSuggestionDto campaign)
    {
        campaign.ProductId = campaign.ProductId?.Trim() ?? string.Empty;
        campaign.ProductName = campaign.ProductName?.Trim() ?? string.Empty;
        campaign.Category = campaign.Category?.Trim() ?? string.Empty;
        campaign.Title = campaign.Title?.Trim() ?? string.Empty;
        campaign.Rationale = campaign.Rationale?.Trim() ?? string.Empty;
        campaign.InstagramCaption = campaign.InstagramCaption?.Trim() ?? string.Empty;
        campaign.ReelScript = campaign.ReelScript?.Trim() ?? string.Empty;
        campaign.Cta = campaign.Cta?.Trim() ?? string.Empty;

        campaign.Score = Clamp(campaign.Score, 0, 100);
        campaign.Confidence = NormalizeConfidence(campaign.Confidence);
        campaign.ExpectedRoi = campaign.ExpectedRoi < 0 ? 0 : campaign.ExpectedRoi;
        campaign.EstimatedRevenue = campaign.EstimatedRevenue < 0 ? 0 : campaign.EstimatedRevenue;

        campaign.CarouselSlides = CleanList(campaign.CarouselSlides);
        campaign.Hashtags = CleanList(campaign.Hashtags);

        if (!Enum.IsDefined(campaign.Priority))
        {
            campaign.Priority = campaign.Score switch
            {
                >= 90 => CampaignPriority.Critical,
                >= 75 => CampaignPriority.High,
                >= 50 => CampaignPriority.Medium,
                _ => CampaignPriority.Low,
            };
        }
    }

    /// <summary>Clamps and tidies the fields of a generated content piece.</summary>
    private static void NormalizeContentPiece(ContentPieceDto piece)
    {
        piece.ProductId = piece.ProductId?.Trim() ?? string.Empty;
        piece.ProductName = piece.ProductName?.Trim() ?? string.Empty;
        piece.Category = piece.Category?.Trim() ?? string.Empty;
        piece.Title = piece.Title?.Trim() ?? string.Empty;
        piece.Rationale = piece.Rationale?.Trim() ?? string.Empty;
        piece.TargetAudience = piece.TargetAudience?.Trim() ?? string.Empty;
        piece.Hook = piece.Hook?.Trim() ?? string.Empty;
        piece.Caption = piece.Caption?.Trim() ?? string.Empty;
        piece.ReelScript = piece.ReelScript?.Trim() ?? string.Empty;
        piece.Cta = piece.Cta?.Trim() ?? string.Empty;
        piece.SuggestedMusic = piece.SuggestedMusic?.Trim() ?? string.Empty;
        piece.BestPostingTime = piece.BestPostingTime?.Trim() ?? string.Empty;
        piece.ImagePrompt = piece.ImagePrompt?.Trim() ?? string.Empty;
        piece.ImageNegativePrompt = piece.ImageNegativePrompt?.Trim() ?? string.Empty;

        piece.Score = Clamp(piece.Score, 0, 100);
        piece.Confidence = NormalizeConfidence(piece.Confidence);

        piece.CarouselSlides = CleanList(piece.CarouselSlides);
        piece.Hashtags = CleanList(piece.Hashtags);
        piece.EngagementTips = CleanList(piece.EngagementTips);
        piece.SeoKeywords = CleanList(piece.SeoKeywords);
    }

    /// <summary>Clamps and tidies the fields of a Flipkart suggestion.</summary>
    private static void NormalizeFlipkartSuggestion(FlipkartSuggestionDto suggestion)
    {
        if (string.IsNullOrWhiteSpace(suggestion.Id))
        {
            suggestion.Id = Guid.NewGuid().ToString("N")[..12];
        }

        suggestion.Title = suggestion.Title?.Trim() ?? string.Empty;
        suggestion.Description = suggestion.Description?.Trim() ?? string.Empty;
        suggestion.ExpectedImpact = suggestion.ExpectedImpact?.Trim() ?? string.Empty;
        suggestion.ProductId = string.IsNullOrWhiteSpace(suggestion.ProductId) ? null : suggestion.ProductId.Trim();
        suggestion.ProductName = string.IsNullOrWhiteSpace(suggestion.ProductName) ? null : suggestion.ProductName.Trim();

        suggestion.Confidence = Clamp(suggestion.Confidence, 0, 100);
        suggestion.ActionItems = CleanList(suggestion.ActionItems);

        if (!Enum.IsDefined(suggestion.Priority))
        {
            suggestion.Priority = FlipkartSuggestionPriority.Medium;
        }

        if (!Enum.IsDefined(suggestion.Type))
        {
            suggestion.Type = FlipkartSuggestionType.TitleOptimization;
        }

        if (string.IsNullOrWhiteSpace(suggestion.EstimatedEffort))
        {
            suggestion.EstimatedEffort = "Medium";
        }
    }

    /// <summary>
    /// Normalizes a confidence value to 0..1, accepting the 0..100 percentage
    /// form LLMs frequently emit instead.
    /// </summary>
    private static double NormalizeConfidence(double confidence) =>
        confidence switch
        {
            <= 0 => 0,
            > 1 and <= 100 => Math.Round(confidence / 100d, 4),
            > 100 => 1,
            _ => confidence,
        };

    /// <summary>Drops null/blank entries and trims the survivors.</summary>
    private static List<string> CleanList(List<string>? values) =>
        values is null
            ? new List<string>()
            : values
                .Where(v => !string.IsNullOrWhiteSpace(v))
                .Select(v => v.Trim())
                .ToList();

    private static int Clamp(int value, int min, int max) =>
        value < min ? min : value > max ? max : value;
}
