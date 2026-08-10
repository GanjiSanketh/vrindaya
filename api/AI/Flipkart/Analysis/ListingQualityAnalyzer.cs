using System.Text.RegularExpressions;
using Microsoft.Extensions.Logging;
using Vrindaya.Api.AI.Flipkart.DTOs;

namespace Vrindaya.Api.AI.Flipkart.Analysis;

/// <summary>
/// Deterministic Flipkart listing quality analyzer. Computes five heuristic
/// scores (SEO, readability, keyword density, customer appeal, Flipkart
/// optimization) from the request attributes and the generated listing
/// response, and emits concrete improvement suggestions. No AI provider calls.
/// </summary>
public sealed class ListingQualityAnalyzer : IListingQualityAnalyzer
{
    private const int MaxTitleChars = 80;
    private const int MaxMetaTitleChars = 60;
    private const int MaxMetaDescriptionChars = 160;
    private const int MaxBackendKeywordsChars = 200;
    private const int MinKeywordCount = 5;

    private static readonly Regex WordBoundary = new(@"\b", RegexOptions.Compiled);

    private readonly ILogger<ListingQualityAnalyzer> _logger;

    public ListingQualityAnalyzer(ILogger<ListingQualityAnalyzer> logger)
    {
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    /// <summary>
    /// Scores the supplied listing across all five quality dimensions.
    /// </summary>
    public ListingQualityAnalysis Analyze(
        FlipkartListingRequest request,
        FlipkartListingResponse response)
    {
        if (request is null) throw new ArgumentNullException(nameof(request));
        if (response is null) throw new ArgumentNullException(nameof(response));

        var suggestions = new List<QualitySuggestion>();

        var seo = ScoreSeo(request, response, suggestions);
        var readability = ScoreReadability(request, response, suggestions);
        var keywordDensity = ScoreKeywordDensity(request, response, suggestions);
        var customerAppeal = ScoreCustomerAppeal(request, response, suggestions);
        var flipkartOpt = ScoreFlipkartOptimization(request, response, suggestions);

        var overall = Math.Round(
            (seo + readability + keywordDensity + customerAppeal + flipkartOpt) / 5.0, 1);

        _logger.LogInformation(
            "ListingQualityAnalyzer: scores for '{ProductName}' — Overall {Overall:F1} | " +
            "SEO {Seo} | Read {Read} | KW {Kw} | Appeal {Appeal} | Flipkart {Flipkart} | " +
            "Suggestions {Count}.",
            request.ProductName,
            overall,
            seo,
            readability,
            keywordDensity,
            customerAppeal,
            flipkartOpt,
            suggestions.Count);

        return new ListingQualityAnalysis
        {
            OverallScore = overall,
            SeoScore = seo,
            ReadabilityScore = readability,
            KeywordDensityScore = keywordDensity,
            CustomerAppealScore = customerAppeal,
            FlipkartOptimizationScore = flipkartOpt,
            Suggestions = suggestions.OrderBy(s => s.Severity).ThenBy(s => s.Category).ToList(),
        };
    }

    // -------------------------------------------------------------------
    // SEO
    // -------------------------------------------------------------------

    private static int ScoreSeo(
        FlipkartListingRequest request,
        FlipkartListingResponse response,
        List<QualitySuggestion> suggestions)
    {
        var score = 0;
        var max = 0;

        // Title present and within length.
        max += 20;
        if (!string.IsNullOrWhiteSpace(response.Title))
        {
            score += 10;
            if (response.Title.Length <= MaxTitleChars)
            {
                score += 10;
            }
            else
            {
                suggestions.Add(new QualitySuggestion(
                    "SEO",
                    $"Listing title is {response.Title.Length} characters — keep it at or under {MaxTitleChars} for optimal Flipkart display.",
                    QualitySeverity.Medium));
            }
        }
        else
        {
            suggestions.Add(new QualitySuggestion(
                "SEO", "Listing title is missing — populate it with Brand + Product + key attributes.",
                QualitySeverity.High));
        }

        // Title starts with brand (if brand supplied).
        max += 10;
        if (!string.IsNullOrWhiteSpace(request.Brand))
        {
            if (response.Title.StartsWith(request.Brand, StringComparison.OrdinalIgnoreCase))
            {
                score += 10;
            }
            else
            {
                suggestions.Add(new QualitySuggestion(
                    "SEO",
                    $"Title does not start with the brand '{request.Brand}' — Flipkart favours brand-led titles.",
                    QualitySeverity.High));
            }
        }
        else
        {
            score += 10;
        }

        // Meta title present and within length.
        max += 10;
        if (!string.IsNullOrWhiteSpace(response.MetaTitle))
        {
            if (response.MetaTitle.Length <= MaxMetaTitleChars)
                score += 10;
            else
                suggestions.Add(new QualitySuggestion(
                    "SEO",
                    $"Meta title is {response.MetaTitle.Length} chars — trim to {MaxMetaTitleChars} characters.",
                    QualitySeverity.Low));
        }
        else
        {
            suggestions.Add(new QualitySuggestion(
                "SEO", "Meta title is missing — add a concise, <60 char meta title.",
                QualitySeverity.Medium));
        }

        // Meta description present and within length.
        max += 10;
        if (!string.IsNullOrWhiteSpace(response.MetaDescription))
        {
            if (response.MetaDescription.Length <= MaxMetaDescriptionChars)
                score += 10;
            else
                suggestions.Add(new QualitySuggestion(
                    "SEO",
                    $"Meta description is {response.MetaDescription.Length} chars — trim to {MaxMetaDescriptionChars} characters.",
                    QualitySeverity.Low));
        }
        else
        {
            suggestions.Add(new QualitySuggestion(
                "SEO", "Meta description is missing — add a compelling <160 char meta description.",
                QualitySeverity.Medium));
        }

        // Search keyword coverage of request keywords.
        max += 10;
        if (request.Keywords is { Count: > 0 })
        {
            var matched = request.Keywords.Count(k =>
                response.SearchKeywords.Contains(k, StringComparer.OrdinalIgnoreCase) ||
                ContainsWord(response.Title, k) ||
                ContainsWord(response.Description, k));
            var coverage = (double)matched / request.Keywords.Count;
            score += (int)Math.Round(coverage * 10);
            if (coverage < 0.5)
                suggestions.Add(new QualitySuggestion(
                    "SEO",
                    $"Only {matched}/{request.Keywords.Count} supplied keywords appear in the listing — include the rest in title, description or search keywords.",
                    QualitySeverity.Medium));
        }
        else
        {
            score += 10;
        }

        // Backend search keywords within Flipkart limit.
        max += 10;
        var backendLength = response.SearchKeywords.Count > 0
            ? response.SearchKeywords.Sum(k => k.Length) + (response.SearchKeywords.Count - 1) * 2
            : 0;
        if (backendLength <= MaxBackendKeywordsChars)
            score += 10;
        else
            suggestions.Add(new QualitySuggestion(
                "SEO",
                $"Backend search keywords exceed the {MaxBackendKeywordsChars}-character Flipkart limit ({backendLength} chars) — trim the least valuable terms.",
                QualitySeverity.Medium));

        return Scale(score, max);
    }

    // -------------------------------------------------------------------
    // Readability
    // -------------------------------------------------------------------

    private static int ScoreReadability(
        FlipkartListingRequest request,
        FlipkartListingResponse response,
        List<QualitySuggestion> suggestions)
    {
        var max = 0;
        var score = 0;

        // Description word count in an effective range.
        max += 25;
        var descWords = CountWords(response.Description);
        if (descWords >= 150 && descWords <= 500)
            score += 25;
        else if (descWords > 0)
            suggestions.Add(new QualitySuggestion(
                "Readability",
                $"Description is {descWords} words — aim for 150–500 words with a hook, fabric, fit and care sections.",
                QualitySeverity.Low));
        else
            suggestions.Add(new QualitySuggestion(
                "Readability", "Description is empty — write a 150–500 word product description.", QualitySeverity.High));

        // Average sentence length (proxy for readability).
        max += 25;
        var avgSentenceLen = AverageSentenceWordCount(response.Description);
        if (avgSentenceLen > 0 && avgSentenceLen <= 25)
            score += 25;
        else if (avgSentenceLen > 25)
            suggestions.Add(new QualitySuggestion(
                "Readability",
                $"Average sentence length is {avgSentenceLen:F0} words — keep sentences under 25 words for scannability.",
                QualitySeverity.Low));
        else
            score += 25;

        // Feature bullet count.
        max += 25;
        var bulletCount = response.KeyFeatures?.Count ?? 0;
        if (bulletCount >= 3)
            score += 25;
        else
            suggestions.Add(new QualitySuggestion(
                "Readability",
                $"Only {bulletCount} key feature bullets — add at least 3 scannable benefits.",
                QualitySeverity.Medium));

        // No overly long bullets.
        max += 25;
        var longBullets = (response.KeyFeatures ?? []).Count(b => b?.Length > 120);
        if (longBullets == 0)
            score += 25;
        else
            suggestions.Add(new QualitySuggestion(
                "Readability",
                $"{longBullets} feature bullet(s) exceed 120 characters — shorten for scan-friendly reading.",
                QualitySeverity.Low));

        return Scale(score, max);
    }

    // -------------------------------------------------------------------
    // Keyword Density
    // -------------------------------------------------------------------

    private static int ScoreKeywordDensity(
        FlipkartListingRequest request,
        FlipkartListingResponse response,
        List<QualitySuggestion> suggestions)
    {
        var max = 0;
        var score = 0;

        // Coverage: fraction of request keywords present across the listing.
        max += 30;
        int coverageMatched;
        if (request.Keywords is { Count: > 0 })
        {
            coverageMatched = request.Keywords.Count(k =>
                ContainsWord(response.Title, k) ||
                ContainsWord(response.Description, k) ||
                response.SearchKeywords.Contains(k, StringComparer.OrdinalIgnoreCase));
            var coverage = (double)coverageMatched / request.Keywords.Count;
            score += (int)Math.Round(coverage * 30);
            if (coverage < 0.6)
                suggestions.Add(new QualitySuggestion(
                    "Keyword Density",
                    $"{coverageMatched}/{request.Keywords.Count} keywords appear in the listing — improve coverage without overstuffing.",
                    QualitySeverity.Medium));
        }
        else
        {
            coverageMatched = 0;
            score += 15;
        }

        // Backend keyword count.
        max += 20;
        var keywordCount = response.SearchKeywords?.Count ?? 0;
        var keywordScore = Math.Min(keywordCount, MinKeywordCount) / (double)MinKeywordCount;
        score += (int)Math.Round(keywordScore * 20);
        if (keywordCount < MinKeywordCount)
            suggestions.Add(new QualitySuggestion(
                "Keyword Density",
                $"Only {keywordCount} backend search keywords — add up to {MinKeywordCount} to maximize discoverability.",
                QualitySeverity.Medium));

        // Density balance: primary product/category keyword not excessive.
        max += 20;
        var density = ComputeDensity(response.Description, productNameOrFallback(request));
        if (density <= 5.0)
            score += 20;
        else
            suggestions.Add(new QualitySuggestion(
                "Keyword Density",
                $"Primary keyword density is {density:F1}% — keep it at or below 5% to avoid Flipkart keyword stuffing penalties.",
                QualitySeverity.Medium));

        // Meta reuse of keywords.
        max += 30;
        var metaCoverage = MetaKeywordCoverage(request, response);
        score += (int)Math.Round(metaCoverage * 30);
        if (metaCoverage < 0.5)
            suggestions.Add(new QualitySuggestion(
                "Keyword Density",
                "Meta title/description reuse few request keywords — weave key terms in naturally.",
                QualitySeverity.Low));

        // Penalize overstuffing if coverage == full and backend > 15 keywords.
        if (coverageMatched == request.Keywords.Count && keywordCount > 15 && density > 5.0)
        {
            suggestions.Add(new QualitySuggestion(
                "Keyword Density",
                "Keyword usage looks dense — reduce repetition across title, description and backend keywords.",
                QualitySeverity.Medium));
        }

        return Scale(score, max);
    }

    // -------------------------------------------------------------------
    // Customer Appeal
    // -------------------------------------------------------------------

    private static int ScoreCustomerAppeal(
        FlipkartListingRequest request,
        FlipkartListingResponse response,
        List<QualitySuggestion> suggestions)
    {
        var max = 0;
        var score = 0;

        // Bullet presence.
        max += 25;
        var bulletCount = response.KeyFeatures?.Count ?? 0;
        if (bulletCount >= 3)
            score += 25;
        else
            suggestions.Add(new QualitySuggestion(
                "Customer Appeal",
                $"Only {bulletCount} benefit-focused bullets — describe tangible customer benefits, not just specs.",
                QualitySeverity.Medium));

        // Description length (enough copy to sell).
        max += 25;
        var descWords = CountWords(response.Description);
        if (descWords >= 100)
            score += 25;
        else
            suggestions.Add(new QualitySuggestion(
                "Customer Appeal",
                $"Description is {descWords} words — write a richer story around fit, fabric and styling.",
                QualitySeverity.Medium));

        // Benefit / emotive language presence.
        max += 25;
        var benefitHit = BenefitWordCount(response.Description, response.KeyFeatures);
        score += benefitHit > 0 ? 25 : 0;
        if (benefitHit == 0)
            suggestions.Add(new QualitySuggestion(
                "Customer Appeal",
                "No benefit-driven language detected — use words like 'comfortable', 'stylish', 'premium' and 'elegant'.",
                QualitySeverity.High));

        // Call-to-action tone / engagement.
        max += 25;
        var appealHit = EngagementWordCount(response.Description);
        score += appealHit > 0 ? 25 : 0;
        if (appealHit == 0)
            suggestions.Add(new QualitySuggestion(
                "Customer Appeal",
                "Description lacks an engaging tone — invite the shopper with confident, benefit-led language.",
                QualitySeverity.Medium));

        return Scale(score, max);
    }

    // -------------------------------------------------------------------
    // Flipkart Optimization
    // -------------------------------------------------------------------

    private static int ScoreFlipkartOptimization(
        FlipkartListingRequest request,
        FlipkartListingResponse response,
        List<QualitySuggestion> suggestions)
    {
        var max = 0;
        var score = 0;

        // Title starts with brand.
        max += 20;
        if (!string.IsNullOrWhiteSpace(request.Brand))
        {
            if (response.Title.StartsWith(request.Brand, StringComparison.OrdinalIgnoreCase))
                score += 20;
            else
                suggestions.Add(new QualitySuggestion(
                    "Flipkart Optimization",
                    $"Title should start with the brand '{request.Brand}' — Flipkart uses this for brand-based filtering.",
                    QualitySeverity.High));
        }
        else
        {
            score += 20;
        }

        // Backend keywords within limit.
        max += 20;
        var backendLength = response.SearchKeywords.Count > 0
            ? response.SearchKeywords.Sum(k => k.Length) + (response.SearchKeywords.Count - 1) * 2
            : 0;
        if (backendLength <= MaxBackendKeywordsChars && response.SearchKeywords.Count >= MinKeywordCount)
            score += 20;
        else
            suggestions.Add(new QualitySuggestion(
                "Flipkart Optimization",
                $"Backend search keywords should total 5–{MaxBackendKeywordsChars} characters and stay searchable — currently {backendLength} chars.",
                QualitySeverity.Medium));

        // All required fields populated.
        max += 20;
        var populated = 0;
        if (!string.IsNullOrWhiteSpace(response.Title)) populated++;
        if (!string.IsNullOrWhiteSpace(response.Description)) populated++;
        if (!string.IsNullOrWhiteSpace(response.MetaTitle)) populated++;
        if (!string.IsNullOrWhiteSpace(response.MetaDescription)) populated++;
        if (response.KeyFeatures?.Count > 0) populated++;
        if (!string.IsNullOrWhiteSpace(response.VideoPrompt)) populated++;
        score += (int)Math.Round(populated / 6.0 * 20);
        if (populated < 6)
            suggestions.Add(new QualitySuggestion(
                "Flipkart Optimization",
                $"{6 - populated} listing field(s) are empty — complete every section for a full-featured Flipkart listing.",
                QualitySeverity.Medium));

        // Meta title/description within limits.
        max += 20;
        var withinLimits = response.MetaTitle.Length <= MaxMetaTitleChars &&
                           response.MetaDescription.Length <= MaxMetaDescriptionChars;
        score += withinLimits ? 20 : 0;
        if (!withinLimits)
            suggestions.Add(new QualitySuggestion(
                "Flipkart Optimization",
                "Trim meta title (<=60) and meta description (<=160) to Flipkart's recommended lengths.",
                QualitySeverity.Low));

        // Feature bullets count.
        max += 20;
        if ((response.KeyFeatures?.Count ?? 0) >= 3)
            score += 20;
        else
            suggestions.Add(new QualitySuggestion(
                "Flipkart Optimization",
                "Add at least 3 feature bullets — Flipkart shoppers scan these first.",
                QualitySeverity.Medium));

        return Scale(score, max);
    }

    // -------------------------------------------------------------------
    // Utilities
    // -------------------------------------------------------------------

    private static int Scale(int score, int max) =>
        max <= 0 ? 0 : Math.Max(0, Math.Min(100, (int)Math.Round((double)score / max * 100)));

    private static bool ContainsWord(string? haystack, string needle)
    {
        if (string.IsNullOrWhiteSpace(haystack) || string.IsNullOrWhiteSpace(needle))
            return false;

        var idx = haystack.IndexOf(needle, StringComparison.OrdinalIgnoreCase);
        if (idx < 0)
            return false;

        // Ensure it's a word boundary match (not a substring inside another word).
        var leftOk = idx == 0 || !char.IsLetterOrDigit(haystack[idx - 1]);
        var rightIdx = idx + needle.Length;
        var rightOk = rightIdx >= haystack.Length || !char.IsLetterOrDigit(haystack[rightIdx]);

        return leftOk && rightOk;
    }

    private static int CountWords(string? text) =>
        string.IsNullOrWhiteSpace(text) ? 0 : WordBoundary.Split(text).Length - 1 < 0 ? 0
            : Math.Max(0, WordBoundary.Split(text).Length - 1);

    private static double AverageSentenceWordCount(string? text)
    {
        if (string.IsNullOrWhiteSpace(text))
            return 0;

        var sentences = text.Split(new[] { '.', '!', '?' }, StringSplitOptions.RemoveEmptyEntries);
        var sentenceWords = sentences.Select(s => CountWords(s)).Where(c => c > 0).ToArray();

        return sentenceWords.Length == 0
            ? 0
            : sentenceWords.Average();
    }

    private static int BenefitWordCount(string? description, List<string>? features)
    {
        var benefitWords = new[]
        {
            "comfortable", "stylish", "premium", "elegant", "soft", "durable",
            "versatile", "elegant", "handcrafted", "premium", "luxury",
            "breathable", "lightweight", "flattering", "elegant",
        };

        var text = $"{description ?? string.Empty} {string.Join(" ", features ?? [])}".ToLowerInvariant();
        return benefitWords.Count(word => text.Contains(word, StringComparison.OrdinalIgnoreCase));
    }

    private static int EngagementWordCount(string? description)
    {
        var engagementWords = new[]
        {
            "discover", "experience", "elevate", "upgrade", "unleash",
            "captivate", "immerse", "transform", "celebrate", "radiate",
            "confidence", "grace", "statement",
        };

        var text = (description ?? string.Empty).ToLowerInvariant();
        return engagementWords.Count(word => text.Contains(word, StringComparison.OrdinalIgnoreCase));
    }

    private static double ComputeDensity(string? text, string term)
    {
        if (string.IsNullOrWhiteSpace(text) || string.IsNullOrWhiteSpace(term))
            return 0;

        var wordCount = CountWords(text);
        if (wordCount == 0)
            return 0;

        var termOccurrences = WordBoundary
            .Split(text)
            .Count(w => string.Equals(w, term, StringComparison.OrdinalIgnoreCase));

        return termOccurrences / (double)wordCount * 100;
    }

    private static double MetaKeywordCoverage(
        FlipkartListingRequest request,
        FlipkartListingResponse response)
    {
        if (request.Keywords is null || request.Keywords.Count == 0)
            return 1.0;

        var metaText = $"{response.MetaTitle} {response.MetaDescription}".ToLowerInvariant();
        var hits = request.Keywords.Count(k =>
            !string.IsNullOrWhiteSpace(k) && metaText.Contains(k, StringComparison.OrdinalIgnoreCase));
        return (double)hits / request.Keywords.Count;
    }

    private static string productNameOrFallback(FlipkartListingRequest request) =>
        string.IsNullOrWhiteSpace(request.ProductName)
            ? "product"
            : request.ProductName;
}
