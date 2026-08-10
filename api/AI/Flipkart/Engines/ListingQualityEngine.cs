using System.Text.RegularExpressions;
using Microsoft.Extensions.Logging;
using Vrindaya.Api.AI.Flipkart.Analysis;
using Vrindaya.Api.AI.Flipkart.DTOs;
using Vrindaya.Api.AI.Flipkart.Interfaces;
using static Vrindaya.Api.AI.Flipkart.Engines.ListingQualityConstants;

namespace Vrindaya.Api.AI.Flipkart.Engines;

/// <summary>
/// Default <see cref="IListingQualityEngine"/>. Computes a weighted quality
/// score (0–100) for a Flipkart listing across seven dimensions — title
/// quality, description quality, bullet points, image count, SEO keywords,
/// brand consistency, attribute completeness — purely from the listing's own
/// attributes. No AI provider calls, no Firestore reads, no randomness.
/// </summary>
public sealed class ListingQualityEngine : IListingQualityEngine
{
    private static readonly Regex WordBoundary = new(@"\b", RegexOptions.Compiled);
    private static readonly Regex SentenceSplit = new(@"[.!?]+", RegexOptions.Compiled);

    private static readonly HashSet<string> ExpectedAttributes = new(StringComparer.OrdinalIgnoreCase)
    {
        "Color", "Size", "Fabric", "Fit", "Pattern", "Sleeve", "Neck", "Occasion",
        "Material", "Length", "Style", "Design", "WashCare", "PackOf",
    };

    private readonly ILogger<ListingQualityEngine> _logger;

    public ListingQualityEngine(ILogger<ListingQualityEngine> logger)
    {
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public ListingQualityResultDto Evaluate(ListingEvaluationInput listing)
    {
        if (listing is null)
            throw new ArgumentNullException(nameof(listing));

        var suggestions = new List<QualitySuggestion>();

        var titleScore = ScoreTitle(listing, suggestions);
        var descriptionScore = ScoreDescription(listing, suggestions);
        var bulletPointsScore = ScoreBulletPoints(listing, suggestions);
        var imageCountScore = ScoreImageCount(listing, suggestions);
        var seoKeywordsScore = ScoreSeoKeywords(listing, suggestions);
        var brandConsistencyScore = ScoreBrandConsistency(listing, suggestions);
        var attributeCompletenessScore = ScoreAttributeCompleteness(listing, suggestions);

        var weighted =
            (titleScore * TitleQualityWeight)
            + (descriptionScore * DescriptionQualityWeight)
            + (bulletPointsScore * BulletPointsWeight)
            + (imageCountScore * ImageCountWeight)
            + (seoKeywordsScore * SeoKeywordsWeight)
            + (brandConsistencyScore * BrandConsistencyWeight)
            + (attributeCompletenessScore * AttributeCompletenessWeight);

        var overall = (int)Math.Clamp(
            Math.Round((double)weighted / TotalWeight),
            MinScore,
            MaxScore);

        _logger.LogInformation(
            "ListingQualityEngine: evaluated '{ProductName}' — Overall {Overall}/100 | " +
            "Title {Title} | Desc {Desc} | Bullets {Bullets} | Images {Images} | " +
            "SEO {Seo} | Brand {Brand} | Attributes {Attrs} | Suggestions {Count}.",
            listing.ProductName,
            overall,
            titleScore,
            descriptionScore,
            bulletPointsScore,
            imageCountScore,
            seoKeywordsScore,
            brandConsistencyScore,
            attributeCompletenessScore,
            suggestions.Count);

        return new ListingQualityResultDto
        {
            OverallScore = overall,
            TitleScore = titleScore,
            DescriptionScore = descriptionScore,
            BulletPointsScore = bulletPointsScore,
            ImageCountScore = imageCountScore,
            SeoKeywordsScore = seoKeywordsScore,
            BrandConsistencyScore = brandConsistencyScore,
            AttributeCompletenessScore = attributeCompletenessScore,
            Suggestions = suggestions
                .OrderByDescending(s => s.Severity)
                .ThenBy(s => s.Category)
                .ToList(),
        };
    }

    // -------------------------------------------------------------------
    // Title quality (0–100)
    // -------------------------------------------------------------------

    private static int ScoreTitle(ListingEvaluationInput listing, List<QualitySuggestion> suggestions)
    {
        var score = 0;

        if (string.IsNullOrWhiteSpace(listing.Title))
        {
            suggestions.Add(new QualitySuggestion(
                "Title Quality",
                "Listing title is missing — add a descriptive, brand-led title (40–80 characters).",
                QualitySeverity.High));
            return 0;
        }

        var len = listing.Title.Length;

        // Length score (0–60)
        if (len >= IdealTitleMinChars && len <= IdealTitleMaxChars)
        {
            score += 60;
        }
        else if (len >= MinTitleChars && len < IdealTitleMinChars)
        {
            score += 40;
            suggestions.Add(new QualitySuggestion(
                "Title Quality",
                $"Title is {len} characters — expand to at least {IdealTitleMinChars} characters for better visibility.",
                QualitySeverity.Medium));
        }
        else if (len > IdealTitleMaxChars && len <= MaxTitleChars)
        {
            score += 35;
            suggestions.Add(new QualitySuggestion(
                "Title Quality",
                $"Title is {len} characters — trim to {IdealTitleMaxChars} characters for optimal display.",
                QualitySeverity.Low));
        }
        else if (len < MinTitleChars)
        {
            score += 15;
            suggestions.Add(new QualitySuggestion(
                "Title Quality",
                $"Title is only {len} characters — too short. Expand to at least {IdealTitleMinChars} characters.",
                QualitySeverity.High));
        }
        else
        {
            score += 20;
            suggestions.Add(new QualitySuggestion(
                "Title Quality",
                $"Title is {len} characters — exceeds the {MaxTitleChars}-character limit. Trim significantly.",
                QualitySeverity.High));
        }

        // Brand presence in title (0–25)
        if (!string.IsNullOrWhiteSpace(listing.Brand))
        {
            if (listing.Title.StartsWith(listing.Brand, StringComparison.OrdinalIgnoreCase))
            {
                score += 25;
            }
            else if (ContainsWord(listing.Title, listing.Brand))
            {
                score += 15;
                suggestions.Add(new QualitySuggestion(
                    "Title Quality",
                    $"Title contains brand '{listing.Brand}' but does not start with it — Flipkart favours brand-led titles.",
                    QualitySeverity.Medium));
            }
            else
            {
                score += 5;
                suggestions.Add(new QualitySuggestion(
                    "Title Quality",
                    $"Brand '{listing.Brand}' is missing from the title — include it at the start.",
                    QualitySeverity.High));
            }
        }
        else
        {
            score += 15;
        }

        // Category keyword presence (0–15)
        if (!string.IsNullOrWhiteSpace(listing.Category) && ContainsWord(listing.Title, listing.Category))
        {
            score += 15;
        }
        else if (!string.IsNullOrWhiteSpace(listing.Category))
        {
            suggestions.Add(new QualitySuggestion(
                "Title Quality",
                $"Title does not contain the category '{listing.Category}' — include it for better search relevance.",
                QualitySeverity.Medium));
        }
        else
        {
            score += 10;
        }

        return Math.Min(score, MaxScore);
    }

    // -------------------------------------------------------------------
    // Description quality (0–100)
    // -------------------------------------------------------------------

    private static int ScoreDescription(ListingEvaluationInput listing, List<QualitySuggestion> suggestions)
    {
        var score = 0;

        if (string.IsNullOrWhiteSpace(listing.Description))
        {
            suggestions.Add(new QualitySuggestion(
                "Description Quality",
                "Description is missing — write a detailed 150–500 word description covering features, fabric, fit and care.",
                QualitySeverity.High));
            return 0;
        }

        var wordCount = CountWords(listing.Description);

        // Word count score (0–50)
        if (wordCount >= IdealDescriptionMinWords && wordCount <= IdealDescriptionMaxWords)
        {
            score += 50;
        }
        else if (wordCount >= MinDescriptionWords && wordCount < IdealDescriptionMinWords)
        {
            score += 30;
            suggestions.Add(new QualitySuggestion(
                "Description Quality",
                $"Description is {wordCount} words — expand to at least {IdealDescriptionMinWords} words for a compelling listing.",
                QualitySeverity.Medium));
        }
        else if (wordCount > IdealDescriptionMaxWords && wordCount <= MaxDescriptionWords)
        {
            score += 30;
            suggestions.Add(new QualitySuggestion(
                "Description Quality",
                $"Description is {wordCount} words — consider trimming to {IdealDescriptionMaxWords} words for readability.",
                QualitySeverity.Low));
        }
        else if (wordCount < MinDescriptionWords)
        {
            score += 10;
            suggestions.Add(new QualitySuggestion(
                "Description Quality",
                $"Description is only {wordCount} words — too brief. Expand to at least {IdealDescriptionMinWords} words.",
                QualitySeverity.High));
        }
        else
        {
            score += 15;
            suggestions.Add(new QualitySuggestion(
                "Description Quality",
                $"Description is {wordCount} words — exceeds {MaxDescriptionWords} words. Trim for shopper engagement.",
                QualitySeverity.Medium));
        }

        // Sentence length (0–25)
        var avgSentenceLen = AverageSentenceWordCount(listing.Description);
        if (avgSentenceLen > 0 && avgSentenceLen <= IdealMaxSentenceLength)
        {
            score += 25;
        }
        else if (avgSentenceLen > IdealMaxSentenceLength)
        {
            score += 10;
            suggestions.Add(new QualitySuggestion(
                "Description Quality",
                $"Average sentence length is {avgSentenceLen:F0} words — keep under {IdealMaxSentenceLength:F0} words for scannability.",
                QualitySeverity.Low));
        }
        else
        {
            score += 25;
        }

        // Benefit language (0–25)
        var benefitHits = CountBenefitWords(listing.Description);
        if (benefitHits >= 3)
        {
            score += 25;
        }
        else if (benefitHits >= 1)
        {
            score += 15;
            suggestions.Add(new QualitySuggestion(
                "Description Quality",
                "Description has some benefit language — add more benefit-driven words (comfortable, stylish, durable).",
                QualitySeverity.Low));
        }
        else
        {
            suggestions.Add(new QualitySuggestion(
                "Description Quality",
                "No benefit-driven language detected — use words like 'comfortable', 'stylish', 'premium', 'durable'.",
                QualitySeverity.High));
        }

        return Math.Min(score, MaxScore);
    }

    // -------------------------------------------------------------------
    // Bullet points quality (0–100)
    // -------------------------------------------------------------------

    private static int ScoreBulletPoints(ListingEvaluationInput listing, List<QualitySuggestion> suggestions)
    {
        var score = 0;
        var bullets = listing.BulletPoints ?? [];

        if (bullets.Count == 0)
        {
            suggestions.Add(new QualitySuggestion(
                "Bullet Points",
                "No bullet points — add at least 3–5 scannable, benefit-focused bullet points.",
                QualitySeverity.High));
            return 0;
        }

        // Count score (0–50)
        if (bullets.Count >= IdealMinBulletPoints)
        {
            score += 50;
        }
        else if (bullets.Count >= MinBulletPoints)
        {
            score += 35;
            suggestions.Add(new QualitySuggestion(
                "Bullet Points",
                $"Only {bullets.Count} bullet points — add at least {IdealMinBulletPoints} for better coverage.",
                QualitySeverity.Low));
        }
        else
        {
            score += 20;
            suggestions.Add(new QualitySuggestion(
                "Bullet Points",
                $"Only {bullets.Count} bullet points — add at least {MinBulletPoints} scannable benefits.",
                QualitySeverity.High));
        }

        // Length appropriateness (0–30)
        var longBullets = bullets.Count(b => !string.IsNullOrWhiteSpace(b) && b.Length > MaxBulletPointLength);
        var emptyBullets = bullets.Count(b => string.IsNullOrWhiteSpace(b));

        if (longBullets == 0 && emptyBullets == 0)
        {
            score += 30;
        }
        else
        {
            var penalty = (longBullets + emptyBullets) * 10;
            score += Math.Max(0, 30 - penalty);

            if (longBullets > 0)
            {
                suggestions.Add(new QualitySuggestion(
                    "Bullet Points",
                    $"{longBullets} bullet point(s) exceed {MaxBulletPointLength} characters — shorten for scan-friendly reading.",
                    QualitySeverity.Low));
            }
            if (emptyBullets > 0)
            {
                suggestions.Add(new QualitySuggestion(
                    "Bullet Points",
                    $"{emptyBullets} empty bullet point(s) detected — remove or populate them.",
                    QualitySeverity.Medium));
            }
        }

        // Benefit language (0–20)
        var text = string.Join(" ", bullets);
        var benefitHits = CountBenefitWords(text);
        if (benefitHits >= 2)
        {
            score += 20;
        }
        else if (benefitHits >= 1)
        {
            score += 10;
            suggestions.Add(new QualitySuggestion(
                "Bullet Points",
                "Some bullets use benefit language — ensure all bullets highlight customer benefits, not just specs.",
                QualitySeverity.Medium));
        }
        else
        {
            suggestions.Add(new QualitySuggestion(
                "Bullet Points",
                "No benefit-driven language in bullets — reframe each bullet as a customer benefit.",
                QualitySeverity.Medium));
        }

        return Math.Min(score, MaxScore);
    }

    // -------------------------------------------------------------------
    // Image count (0–100)
    // -------------------------------------------------------------------

    private static int ScoreImageCount(ListingEvaluationInput listing, List<QualitySuggestion> suggestions)
    {
        var count = listing.ImageCount;

        if (count >= IdealMinImages)
        {
            if (count > MaxImages)
            {
                suggestions.Add(new QualitySuggestion(
                    "Image Count",
                    $"{count} images uploaded — Flipkart displays up to {MaxImages} images; ensure the best {MaxImages} are ordered first.",
                    QualitySeverity.Low));
            }
            return MaxScore;
        }

        if (count >= MinImages)
        {
            suggestions.Add(new QualitySuggestion(
                "Image Count",
                $"{count} images uploaded — add at least {IdealMinImages} images (front, back, close-up, lifestyle, scale).",
                QualitySeverity.Medium));
            return 60;
        }

        if (count > 0)
        {
            suggestions.Add(new QualitySuggestion(
                "Image Count",
                $"Only {count} image(s) uploaded — add at least {IdealMinImages} images for a complete listing.",
                QualitySeverity.High));
            return 30;
        }

        suggestions.Add(new QualitySuggestion(
            "Image Count",
            "No images uploaded — add at least 5 high-quality product images.",
            QualitySeverity.High));
        return 0;
    }

    // -------------------------------------------------------------------
    // SEO keywords (0–100)
    // -------------------------------------------------------------------

    private static int ScoreSeoKeywords(ListingEvaluationInput listing, List<QualitySuggestion> suggestions)
    {
        var score = 0;
        var keywords = listing.SeoKeywords ?? [];

        if (keywords.Count == 0)
        {
            suggestions.Add(new QualitySuggestion(
                "SEO Keywords",
                "No SEO keywords — add 5–15 relevant search keywords for discoverability.",
                QualitySeverity.High));
            return 0;
        }

        // Keyword count score (0–40)
        if (keywords.Count >= IdealMinSeoKeywords && keywords.Count <= MaxSeoKeywords)
        {
            score += 40;
        }
        else if (keywords.Count >= MinSeoKeywords && keywords.Count < IdealMinSeoKeywords)
        {
            score += 25;
            suggestions.Add(new QualitySuggestion(
                "SEO Keywords",
                $"{keywords.Count} SEO keywords — add at least {IdealMinSeoKeywords} for better discoverability.",
                QualitySeverity.Medium));
        }
        else if (keywords.Count > MaxSeoKeywords)
        {
            score += 20;
            suggestions.Add(new QualitySuggestion(
                "SEO Keywords",
                $"{keywords.Count} SEO keywords — exceeds {MaxSeoKeywords}. Focus on the most relevant terms.",
                QualitySeverity.Low));
        }
        else
        {
            score += 15;
            suggestions.Add(new QualitySuggestion(
                "SEO Keywords",
                $"Only {keywords.Count} SEO keywords — add at least {MinSeoKeywords} relevant search terms.",
                QualitySeverity.High));
        }

        // Keyword coverage in title + description (0–40)
        var listingText = $"{listing.Title} {listing.Description}".ToLowerInvariant();
        var matched = keywords.Count(k =>
            !string.IsNullOrWhiteSpace(k) && listingText.Contains(k, StringComparison.OrdinalIgnoreCase));

        if (keywords.Count > 0)
        {
            var coverage = (double)matched / keywords.Count;
            score += (int)Math.Round(coverage * 40);

            if (coverage < 0.5)
            {
                suggestions.Add(new QualitySuggestion(
                    "SEO Keywords",
                    $"Only {matched}/{keywords.Count} keywords appear in the title/description — embed more keywords naturally.",
                    QualitySeverity.Medium));
            }
        }
        else
        {
            score += 20;
        }

        // Keyword density check (0–20)
        var density = ComputeKeywordDensity(listing.Description, keywords);
        if (density <= IdealKeywordDensityPercent)
        {
            score += 20;
        }
        else if (density <= MaxKeywordDensityPercent)
        {
            score += 10;
            suggestions.Add(new QualitySuggestion(
                "SEO Keywords",
                $"Keyword density is {density:F1}% — near the upper limit. Consider reducing slightly.",
                QualitySeverity.Low));
        }
        else
        {
            suggestions.Add(new QualitySuggestion(
                "SEO Keywords",
                $"Keyword density is {density:F1}% — exceeds {MaxKeywordDensityPercent:F0}%. Reduce repetition to avoid penalties.",
                QualitySeverity.High));
        }

        return Math.Min(score, MaxScore);
    }

    // -------------------------------------------------------------------
    // Brand consistency (0–100)
    // -------------------------------------------------------------------

    private static int ScoreBrandConsistency(ListingEvaluationInput listing, List<QualitySuggestion> suggestions)
    {
        if (string.IsNullOrWhiteSpace(listing.Brand))
        {
            suggestions.Add(new QualitySuggestion(
                "Brand Consistency",
                "No brand specified — ensure the brand is consistently used across title, description and attributes.",
                QualitySeverity.Medium));
            return 50;
        }

        var score = 0;
        var brand = listing.Brand;

        // Brand in title (0–40)
        if (listing.Title.StartsWith(brand, StringComparison.OrdinalIgnoreCase))
        {
            score += 40;
        }
        else if (ContainsWord(listing.Title, brand))
        {
            score += 20;
            suggestions.Add(new QualitySuggestion(
                "Brand Consistency",
                $"Brand '{brand}' appears in the title but does not start it — move it to the beginning.",
                QualitySeverity.Medium));
        }
        else
        {
            suggestions.Add(new QualitySuggestion(
                "Brand Consistency",
                $"Brand '{brand}' is missing from the title — add it at the start.",
                QualitySeverity.High));
        }

        // Brand in description (0–35)
        if (ContainsWord(listing.Description, brand))
        {
            score += 35;
        }
        else
        {
            score += 10;
            suggestions.Add(new QualitySuggestion(
                "Brand Consistency",
                $"Brand '{brand}' is missing from the description — mention it at least once.",
                QualitySeverity.Medium));
        }

        // Brand in attributes (0–25)
        if (listing.Attributes.Values.Any(v =>
            !string.IsNullOrWhiteSpace(v) &&
            v.Contains(brand, StringComparison.OrdinalIgnoreCase)))
        {
            score += 25;
        }
        else
        {
            score += 10;
            suggestions.Add(new QualitySuggestion(
                "Brand Consistency",
                $"Brand '{brand}' is not listed in product attributes — add it to the Brand attribute.",
                QualitySeverity.Low));
        }

        return Math.Min(score, MaxScore);
    }

    // -------------------------------------------------------------------
    // Attribute completeness (0–100)
    // -------------------------------------------------------------------

    private static int ScoreAttributeCompleteness(ListingEvaluationInput listing, List<QualitySuggestion> suggestions)
    {
        if (listing.Attributes is null || listing.Attributes.Count == 0)
        {
            suggestions.Add(new QualitySuggestion(
                "Attribute Completeness",
                "No product attributes — fill in all relevant attributes (Color, Size, Fabric, Fit, Pattern, etc.).",
                QualitySeverity.High));
            return 0;
        }

        var filledAttributes = ExpectedAttributes.Count(attr =>
            listing.Attributes.TryGetValue(attr, out var val) && !string.IsNullOrWhiteSpace(val));

        var totalExpected = ExpectedAttributes.Count;
        var completeness = (int)Math.Round((double)filledAttributes / totalExpected * 100);

        if (completeness >= 80)
        {
            // Good — minor suggestion if not perfect
            if (completeness < 100)
            {
                var missing = ExpectedAttributes.Where(attr =>
                    !listing.Attributes.TryGetValue(attr, out var val) || string.IsNullOrWhiteSpace(val))
                    .ToList();

                if (missing.Count <= 3 && missing.Count > 0)
                {
                    suggestions.Add(new QualitySuggestion(
                        "Attribute Completeness",
                        $"Missing {missing.Count} attribute(s): {string.Join(", ", missing)} — fill for a complete listing.",
                        QualitySeverity.Low));
                }
            }

            return completeness;
        }

        if (completeness >= MinAttributeCompleteness)
        {
            var missing = ExpectedAttributes.Where(attr =>
                !listing.Attributes.TryGetValue(attr, out var val) || string.IsNullOrWhiteSpace(val))
                .ToList();

            suggestions.Add(new QualitySuggestion(
                "Attribute Completeness",
                $"{completeness}% complete — add {missing.Count} more attribute(s): {string.Join(", ", missing.Take(5))}.",
                QualitySeverity.Medium));

            return completeness;
        }

        var allMissing = ExpectedAttributes.Where(attr =>
            !listing.Attributes.TryGetValue(attr, out var val) || string.IsNullOrWhiteSpace(val))
            .ToList();

        suggestions.Add(new QualitySuggestion(
            "Attribute Completeness",
            $"Only {completeness}% complete — add attributes: {string.Join(", ", allMissing.Take(7))}.",
            QualitySeverity.High));

        return completeness;
    }

    // -------------------------------------------------------------------
    // Shared utilities
    // -------------------------------------------------------------------

    private static bool ContainsWord(string? haystack, string needle)
    {
        if (string.IsNullOrWhiteSpace(haystack) || string.IsNullOrWhiteSpace(needle))
            return false;

        var idx = haystack.IndexOf(needle, StringComparison.OrdinalIgnoreCase);
        if (idx < 0)
            return false;

        var leftOk = idx == 0 || !char.IsLetterOrDigit(haystack[idx - 1]);
        var rightIdx = idx + needle.Length;
        var rightOk = rightIdx >= haystack.Length || !char.IsLetterOrDigit(haystack[rightIdx]);

        return leftOk && rightOk;
    }

    private static int CountWords(string? text)
    {
        if (string.IsNullOrWhiteSpace(text))
            return 0;

        var count = WordBoundary.Split(text).Count(s => !string.IsNullOrWhiteSpace(s));
        return Math.Max(0, count);
    }

    private static double AverageSentenceWordCount(string? text)
    {
        if (string.IsNullOrWhiteSpace(text))
            return 0;

        var sentences = SentenceSplit.Split(text);
        var sentenceWords = sentences.Select(CountWords).Where(c => c > 0).ToArray();

        return sentenceWords.Length == 0
            ? 0
            : sentenceWords.Average();
    }

    private static readonly HashSet<string> BenefitWords = new(StringComparer.OrdinalIgnoreCase)
    {
        "comfortable", "stylish", "premium", "elegant", "soft", "durable",
        "versatile", "handcrafted", "luxury", "breathable", "lightweight",
        "flattering", "classic", "modern", "exclusive", "quality", "perfect",
        "beautiful", "gorgeous", "sophisticated", "timeless", "vibrant",
        "smooth", "gentle", "flexible", "supportive", "chic", "trendy",
    };

    private static int CountBenefitWords(string? text)
    {
        if (string.IsNullOrWhiteSpace(text))
            return 0;

        return BenefitWords.Count(word => text.Contains(word, StringComparison.OrdinalIgnoreCase));
    }

    private static double ComputeKeywordDensity(string? text, List<string> keywords)
    {
        if (string.IsNullOrWhiteSpace(text) || keywords.Count == 0)
            return 0;

        var wordCount = CountWords(text);
        if (wordCount == 0)
            return 0;

        var keywordOccurrences = 0;
        foreach (var keyword in keywords)
        {
            if (string.IsNullOrWhiteSpace(keyword))
                continue;

            var idx = 0;
            while ((idx = text.IndexOf(keyword, idx, StringComparison.OrdinalIgnoreCase)) >= 0)
            {
                keywordOccurrences++;
                idx += keyword.Length;
            }
        }

        return keywordOccurrences / (double)wordCount * 100;
    }
}
