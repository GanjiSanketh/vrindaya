using System.Text;
using Microsoft.Extensions.Logging;
using Vrindaya.Api.AI.Core.Interfaces;
using Vrindaya.Api.AI.Flipkart.DTOs;
using Vrindaya.Api.AI.Flipkart.Interfaces;
using Vrindaya.Api.AI.Flipkart.Models;

namespace Vrindaya.Api.AI.Flipkart.Services;

/// <summary>
/// Flipkart AI Assistant — audits listings against Flipkart's marketplace rules
/// and returns prioritized optimization suggestions.
///
/// The findings themselves stay rule-based: whether a title is too short, an
/// attribute is missing or a category is mismatched is a marketplace
/// requirement, not an opinion, so it is checked in code and always produces
/// the same verdict for the same listing.
///
/// The audit <see cref="FlipkartResponseDto.Summary"/> is written by the
/// configured AI provider through the core <see cref="IAiOrchestrator"/> from
/// those findings, so the seller reads a real briefing instead of a counted
/// sentence. If narration is unavailable the deterministic tally is used.
/// </summary>
public sealed class FlipkartAiService : IFlipkartAiService
{
    /// <summary>Telemetry label for prompts issued by this service.</summary>
    private const string ModuleName = "flipkart.audit";

    /// <summary>Instruction keeping the summary grounded in the findings.</summary>
    private const string SystemInstruction =
        "You brief the owner of Vrindaya, an Indian handmade ethnic apparel brand, on a Flipkart " +
        "listing audit. Reply with one plain-text paragraph of at most 80 words — no markdown, no " +
        "lists, no preamble. Summarise what needs attention first and why, using only the findings " +
        "given. Never invent issues and never restate every item.";

    private readonly IAiOrchestrator _orchestrator;
    private readonly ILogger<FlipkartAiService> _logger;

    public FlipkartAiService(
        IAiOrchestrator orchestrator,
        ILogger<FlipkartAiService> logger)
    {
        _orchestrator = orchestrator ?? throw new ArgumentNullException(nameof(orchestrator));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    private static readonly HashSet<string> RequiredAttributes = new(StringComparer.OrdinalIgnoreCase)
    {
        "brand", "color", "size", "material", "pattern", "occasion", "sleeve", "neck", "fit"
    };

    private static readonly Dictionary<string, List<string>> CategoryKeywords = new(StringComparer.OrdinalIgnoreCase)
    {
        ["fashion"] = new() { "trendy", "stylish", "comfortable", "premium", "casual", "formal", "ethnic", "western" },
        ["electronics"] = new() { "latest", "fast", "efficient", "durable", "warranty", "smart", "wireless", "portable" },
        ["home"] = new() { "durable", "elegant", "space-saving", "easy-clean", "premium", "handcrafted", "modern" },
        ["beauty"] = new() { "natural", "organic", "dermatologist-tested", "long-lasting", "cruelty-free", "vegan" },
        ["sports"] = new() { "performance", "breathable", "lightweight", "durable", "professional", "training" },
    };

    public async Task<FlipkartResponseDto> GenerateSuggestionsAsync(
        FlipkartRequestDto request,
        CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();

        var suggestions = new List<FlipkartSuggestionDto>();

        foreach (var product in request.Products)
        {
            var productSuggestions = AnalyzeProduct(product, request);
            suggestions.AddRange(productSuggestions);
        }

        if (request.AssistanceType == FlipkartAssistanceType.FullAudit ||
            request.AssistanceType == FlipkartAssistanceType.KeywordResearch)
        {
            var keywordSuggestions = GenerateKeywordSuggestions(request.Products, request.TargetCategory);
            suggestions.AddRange(keywordSuggestions);
        }

        if (request.AssistanceType == FlipkartAssistanceType.FullAudit ||
            request.AssistanceType == FlipkartAssistanceType.PricingAnalysis)
        {
            var pricingSuggestions = GeneratePricingSuggestions(request.Products);
            suggestions.AddRange(pricingSuggestions);
        }

        suggestions = suggestions
            .OrderByDescending(s => s.Priority)
            .ThenByDescending(s => s.Confidence)
            .Take(request.MaxSuggestions)
            .ToList();

        return new FlipkartResponseDto
        {
            AssistanceType = request.AssistanceType,
            TotalSuggestions = suggestions.Count,
            Suggestions = suggestions,
            Summary = await BuildSummaryAsync(suggestions, request.AssistanceType, cancellationToken),
            ConfidenceScore = suggestions.Count > 0 ? (int)suggestions.Average(s => s.Confidence) : 0,
            GeneratedAt = DateTime.UtcNow,
        };
    }

    /// <summary>
    /// Asks the configured provider to brief the seller on the findings,
    /// falling back to the deterministic tally when nothing is returned.
    /// </summary>
    private async Task<string> BuildSummaryAsync(
        List<FlipkartSuggestionDto> suggestions,
        FlipkartAssistanceType type,
        CancellationToken cancellationToken)
    {
        if (suggestions.Count == 0)
            return "No suggestions generated. All products appear compliant.";

        var prompt = BuildSummaryPrompt(suggestions, type);

        var summary = await _orchestrator.GenerateTextAsync(
            prompt, SystemInstruction, ModuleName, cancellationToken);

        if (string.IsNullOrWhiteSpace(summary))
        {
            _logger.LogInformation(
                "FlipkartAiService: no narrated summary available — using the deterministic tally.");

            return GenerateSummary(suggestions, type);
        }

        return summary.Trim();
    }

    /// <summary>
    /// Renders the audit findings as a brief the model can summarise, ordered
    /// exactly as the caller will see them.
    /// </summary>
    private static string BuildSummaryPrompt(
        List<FlipkartSuggestionDto> suggestions,
        FlipkartAssistanceType type)
    {
        var sb = new StringBuilder();

        sb.AppendLine($"# Flipkart {type} Audit Findings");
        sb.AppendLine();

        foreach (var s in suggestions)
        {
            sb.AppendLine($"- [{s.Priority}] {s.Title}");

            if (!string.IsNullOrWhiteSpace(s.ProductName))
                sb.AppendLine($"  - Product: {s.ProductName}");

            if (!string.IsNullOrWhiteSpace(s.Description))
                sb.AppendLine($"  - Detail: {s.Description}");

            if (!string.IsNullOrWhiteSpace(s.ExpectedImpact))
                sb.AppendLine($"  - Impact: {s.ExpectedImpact}");
        }

        return sb.ToString();
    }

    private List<FlipkartSuggestionDto> AnalyzeProduct(FlipkartProduct product, FlipkartRequestDto request)
    {
        var suggestions = new List<FlipkartSuggestionDto>();

        // Title optimization
        if (request.AssistanceType == FlipkartAssistanceType.FullAudit ||
            request.AssistanceType == FlipkartAssistanceType.ListingOptimization)
        {
            var titleSuggestions = AnalyzeTitle(product);
            suggestions.AddRange(titleSuggestions);
        }

        // Description enhancement
        if (request.AssistanceType == FlipkartAssistanceType.FullAudit ||
            request.AssistanceType == FlipkartAssistanceType.ListingOptimization)
        {
            var descSuggestions = AnalyzeDescription(product);
            suggestions.AddRange(descSuggestions);
        }

        // Attribute completion
        if (request.IncludeComplianceChecks)
        {
            var attrSuggestions = AnalyzeAttributes(product);
            suggestions.AddRange(attrSuggestions);
        }

        // Image analysis
        if (request.AssistanceType == FlipkartAssistanceType.FullAudit ||
            request.AssistanceType == FlipkartAssistanceType.ListingOptimization)
        {
            var imageSuggestions = AnalyzeImages(product);
            suggestions.AddRange(imageSuggestions);
        }

        // Category mapping
        if (request.AssistanceType == FlipkartAssistanceType.FullAudit ||
            request.AssistanceType == FlipkartAssistanceType.ComplianceCheck)
        {
            var categorySuggestions = AnalyzeCategory(product, request.TargetCategory);
            suggestions.AddRange(categorySuggestions);
        }

        // Variant optimization
        var variantSuggestions = AnalyzeVariants(product);
        suggestions.AddRange(variantSuggestions);

        return suggestions;
    }

    private List<FlipkartSuggestionDto> AnalyzeTitle(FlipkartProduct product)
    {
        var suggestions = new List<FlipkartSuggestionDto>();
        var title = product.Name ?? string.Empty;

        if (string.IsNullOrWhiteSpace(title))
        {
            suggestions.Add(new FlipkartSuggestionDto
            {
                Type = FlipkartSuggestionType.TitleOptimization,
                Priority = FlipkartSuggestionPriority.Critical,
                ProductId = product.ProductId,
                ProductName = product.Name,
                Title = "Missing Product Title",
                Description = "Product title is required for Flipkart listings.",
                ActionItems = new List<string> { "Add a descriptive product title", "Include brand, key attributes, and product type" },
                ExpectedImpact = "High - Title is the primary search and conversion driver",
                Confidence = 100,
                EstimatedEffort = "Low",
            });
        }
        else if (title.Length < 20)
        {
            suggestions.Add(new FlipkartSuggestionDto
            {
                Type = FlipkartSuggestionType.TitleOptimization,
                Priority = FlipkartSuggestionPriority.High,
                ProductId = product.ProductId,
                ProductName = product.Name,
                Title = "Title Too Short",
                Description = $"Current title ({title.Length} chars) is below Flipkart's recommended 40-80 characters.",
                ActionItems = new List<string>
                {
                    "Expand title to 40-80 characters",
                    "Include brand, material, color, size, and key features",
                    "Follow format: Brand + Product Type + Key Attributes + Size/Color"
                },
                ExpectedImpact = "Medium - Better search visibility and click-through rate",
                Confidence = 85,
                EstimatedEffort = "Low",
                Comparison = new FlipkartComparisonData
                {
                    Current = title,
                    Recommended = $"[Brand] {title} - [Material] - [Color] - [Size]",
                    Field = "title",
                    Reason = "Flipkart recommends 40-80 characters with key attributes"
                }
            });
        }
        else if (title.Length > 120)
        {
            suggestions.Add(new FlipkartSuggestionDto
            {
                Type = FlipkartSuggestionType.TitleOptimization,
                Priority = FlipkartSuggestionPriority.Medium,
                ProductId = product.ProductId,
                ProductName = product.Name,
                Title = "Title Too Long",
                Description = $"Current title ({title.Length} chars) exceeds Flipkart's 120-character limit and may be truncated.",
                ActionItems = new List<string>
                {
                    "Trim title to under 120 characters",
                    "Prioritize: Brand > Product Type > Key Attributes > Variants",
                    "Remove promotional text (Best Price, Free Shipping, etc.)"
                },
                ExpectedImpact = "Low - Prevents truncation in search results",
                Confidence = 80,
                EstimatedEffort = "Low",
            });
        }

        // Check for promotional text in title
        var promotionalTerms = new[] { "best price", "free shipping", "discount", "offer", "sale", "deal", "cheap" };
        if (promotionalTerms.Any(t => title.Contains(t, StringComparison.OrdinalIgnoreCase)))
        {
            suggestions.Add(new FlipkartSuggestionDto
            {
                Type = FlipkartSuggestionType.TitleOptimization,
                Priority = FlipkartSuggestionPriority.High,
                ProductId = product.ProductId,
                ProductName = product.Name,
                Title = "Promotional Text in Title",
                Description = "Title contains promotional terms which violate Flipkart's listing policies.",
                ActionItems = new List<string>
                {
                    "Remove promotional language from title",
                    "Use Flipkart's promotional tools for discounts/offers",
                    "Keep title factual and attribute-focused"
                },
                ExpectedImpact = "High - Policy compliance, avoids listing suppression",
                Confidence = 95,
                EstimatedEffort = "Low",
            });
        }

        return suggestions;
    }

    private List<FlipkartSuggestionDto> AnalyzeDescription(FlipkartProduct product)
    {
        var suggestions = new List<FlipkartSuggestionDto>();

        // Note: CampaignProduct doesn't have a description field, but we can suggest based on what's available
        suggestions.Add(new FlipkartSuggestionDto
        {
            Type = FlipkartSuggestionType.DescriptionEnhancement,
            Priority = FlipkartSuggestionPriority.Medium,
            ProductId = product.ProductId,
            ProductName = product.Name,
            Title = "Enhance Product Description",
            Description = "Flipkart recommends detailed descriptions with key features, specifications, and usage information.",
            ActionItems = new List<string>
            {
                "Add detailed product description (500+ characters recommended)",
                "Include key features, materials, dimensions, care instructions",
                "Use bullet points for readability",
                "Mention warranty/guarantee information if applicable"
            },
            ExpectedImpact = "Medium - Improves conversion and reduces returns",
            Confidence = 75,
            EstimatedEffort = "Medium",
        });

        return suggestions;
    }

    private List<FlipkartSuggestionDto> AnalyzeAttributes(FlipkartProduct product)
    {
        var suggestions = new List<FlipkartSuggestionDto>();

        // Check for brand
        if (string.IsNullOrWhiteSpace(product.Brand))
        {
            suggestions.Add(new FlipkartSuggestionDto
            {
                Type = FlipkartSuggestionType.AttributeCompletion,
                Priority = FlipkartSuggestionPriority.Critical,
                ProductId = product.ProductId,
                ProductName = product.Name,
                Title = "Missing Brand Attribute",
                Description = "Brand is a mandatory attribute for Flipkart listings.",
                ActionItems = new List<string>
                {
                    "Add brand name to product data",
                    "Ensure brand matches Flipkart's approved brand list"
                },
                ExpectedImpact = "Critical - Listing cannot go live without brand",
                Confidence = 100,
                EstimatedEffort = "Low",
            });
        }

        // Check for missing key attributes based on category
        var missingAttributes = RequiredAttributes.Where(attr =>
            !product.Attributes?.ContainsKey(attr) ?? true).ToList();

        if (missingAttributes.Count > 0)
        {
            suggestions.Add(new FlipkartSuggestionDto
            {
                Type = FlipkartSuggestionType.AttributeCompletion,
                Priority = FlipkartSuggestionPriority.High,
                ProductId = product.ProductId,
                ProductName = product.Name,
                Title = "Missing Required Attributes",
                Description = $"Flipkart requires key attributes for better discoverability. Missing: {string.Join(", ", missingAttributes.Take(5))}",
                ActionItems = missingAttributes.Select(attr => $"Add '{attr}' attribute").ToList(),
                ExpectedImpact = "High - Improves search filtering and conversion",
                Confidence = 90,
                EstimatedEffort = "Medium",
                Metadata = new Dictionary<string, object> { ["missingAttributes"] = missingAttributes }
            });
        }

        return suggestions;
    }

    private List<FlipkartSuggestionDto> AnalyzeImages(FlipkartProduct product)
    {
        var suggestions = new List<FlipkartSuggestionDto>();

        // Check Flipkart-specific image requirements
        if (!string.IsNullOrWhiteSpace(product.FlipkartProductUrl))
        {
            suggestions.Add(new FlipkartSuggestionDto
            {
                Type = FlipkartSuggestionType.ImageImprovement,
                Priority = FlipkartSuggestionPriority.Medium,
                ProductId = product.ProductId,
                ProductName = product.Name,
                Title = "Flipkart Image Compliance",
                Description = "Product has a Flipkart URL - ensure images meet Flipkart's requirements: white background, 1000x1000px minimum, product occupies 80% of frame.",
                ActionItems = new List<string>
                {
                    "Verify main image has pure white background (RGB 255,255,255)",
                    "Ensure minimum 1000x1000px resolution",
                    "Product should occupy 80% of image frame",
                    "Add lifestyle/context images as secondary images",
                    "Include size guide image for apparel"
                },
                ExpectedImpact = "Medium - Better zoom experience, higher conversion",
                Confidence = 80,
                EstimatedEffort = "Medium",
            });
        }
        else
        {
            suggestions.Add(new FlipkartSuggestionDto
            {
                Type = FlipkartSuggestionType.ImageImprovement,
                Priority = FlipkartSuggestionPriority.High,
                ProductId = product.ProductId,
                ProductName = product.Name,
                Title = "No Flipkart Product URL",
                Description = "Product is not linked to a Flipkart listing. Images cannot be validated for Flipkart compliance.",
                ActionItems = new List<string>
                {
                    "Create Flipkart listing or link existing one",
                    "Upload Flipkart-compliant images",
                    "Set FlipkartProductUrl and FlipkartProductId"
                },
                ExpectedImpact = "High - Required for Flipkart presence",
                Confidence = 90,
                EstimatedEffort = "High",
            });
        }

        return suggestions;
    }

    private List<FlipkartSuggestionDto> AnalyzeCategory(FlipkartProduct product, string? targetCategory)
    {
        var suggestions = new List<FlipkartSuggestionDto>();

        if (!string.IsNullOrWhiteSpace(targetCategory) &&
            !string.IsNullOrWhiteSpace(product.Category) &&
            !product.Category.Equals(targetCategory, StringComparison.OrdinalIgnoreCase))
        {
            suggestions.Add(new FlipkartSuggestionDto
            {
                Type = FlipkartSuggestionType.CategoryCorrection,
                Priority = FlipkartSuggestionPriority.High,
                ProductId = product.ProductId,
                ProductName = product.Name,
                Title = "Category Mismatch",
                Description = $"Product category '{product.Category}' differs from target category '{targetCategory}'.",
                ActionItems = new List<string>
                {
                    "Verify correct Flipkart category mapping",
                    "Update product category to match Flipkart taxonomy",
                    "Ensure category-specific attributes are populated"
                },
                ExpectedImpact = "High - Wrong category reduces search visibility",
                Confidence = 85,
                EstimatedEffort = "Low",
                Comparison = new FlipkartComparisonData
                {
                    Current = product.Category,
                    Recommended = targetCategory,
                    Field = "category",
                    Reason = "Align with target Flipkart category for better discoverability"
                }
            });
        }

        return suggestions;
    }

    private List<FlipkartSuggestionDto> AnalyzeVariants(FlipkartProduct product)
    {
        var suggestions = new List<FlipkartSuggestionDto>();

        if (product.Variants != null && product.Variants.Count > 0)
        {
            var variantsWithoutFlipkart = product.Variants
                .Where(v => string.IsNullOrWhiteSpace(v.FlipkartUrl))
                .ToList();

            if (variantsWithoutFlipkart.Count > 0)
            {
                suggestions.Add(new FlipkartSuggestionDto
                {
                    Type = FlipkartSuggestionType.VariantOptimization,
                    Priority = FlipkartSuggestionPriority.Medium,
                    ProductId = product.ProductId,
                    ProductName = product.Name,
                    Title = "Variants Missing Flipkart URLs",
                    Description = $"{variantsWithoutFlipkart.Count} of {product.Variants.Count} variants lack Flipkart URLs.",
                    ActionItems = new List<string>
                    {
                        "Add Flipkart URLs for each variant",
                        "Ensure each variant has unique Flipkart SKU/FSN",
                        "Sync variant-level commission and pricing"
                    },
                    ExpectedImpact = "Medium - Enables variant-level tracking and optimization",
                    Confidence = 80,
                    EstimatedEffort = "Medium",
                    Metadata = new Dictionary<string, object>
                    {
                        ["totalVariants"] = product.Variants.Count,
                        ["missingFlipkartUrls"] = variantsWithoutFlipkart.Count
                    }
                });
            }
        }

        return suggestions;
    }

    private List<FlipkartSuggestionDto> GenerateKeywordSuggestions(List<FlipkartProduct> products, string? targetCategory)
    {
        var suggestions = new List<FlipkartSuggestionDto>();

        var category = targetCategory?.ToLowerInvariant() ?? "fashion";
        var keywords = CategoryKeywords.GetValueOrDefault(category, CategoryKeywords["fashion"]);

        foreach (var product in products.Take(5)) // Limit to first 5 products
        {
            var productKeywords = new List<string>(keywords);

            // Add brand-specific keywords
            if (!string.IsNullOrWhiteSpace(product.Brand))
            {
                productKeywords.Insert(0, product.Brand.ToLowerInvariant());
            }

            // Add category-specific
            if (!string.IsNullOrWhiteSpace(product.Category))
            {
                productKeywords.Add(product.Category.ToLowerInvariant());
            }

            suggestions.Add(new FlipkartSuggestionDto
            {
                Type = FlipkartSuggestionType.KeywordRecommendation,
                Priority = FlipkartSuggestionPriority.Medium,
                ProductId = product.ProductId,
                ProductName = product.Name,
                Title = $"Keyword Recommendations for {product.Name}",
                Description = "Suggested search terms and backend keywords for Flipkart SEO optimization.",
                ActionItems = new List<string>
                {
                    "Add top 5 keywords to Flipkart backend search terms",
                    "Incorporate primary keyword in title naturally",
                    "Use long-tail keywords in description",
                    "Monitor keyword performance in Flipkart Ads"
                },
                ExpectedImpact = "Medium - Improves organic search ranking",
                Confidence = 70,
                EstimatedEffort = "Low",
                Metadata = new Dictionary<string, object>
                {
                    ["recommendedKeywords"] = productKeywords.Take(10).ToList(),
                    ["primaryKeyword"] = productKeywords.FirstOrDefault() ?? string.Empty
                }
            });
        }

        return suggestions;
    }

    private List<FlipkartSuggestionDto> GeneratePricingSuggestions(List<FlipkartProduct> products)
    {
        var suggestions = new List<FlipkartSuggestionDto>();

        foreach (var product in products.Take(5))
        {
            if (product.Price > 0 && product.FlipkartCommission.HasValue)
            {
                var commissionRate = product.FlipkartCommission.Value;
                var netPrice = product.Price * (1 - commissionRate / 100);

                suggestions.Add(new FlipkartSuggestionDto
                {
                    Type = FlipkartSuggestionType.PricingAdjustment,
                    Priority = FlipkartSuggestionPriority.Medium,
                    ProductId = product.ProductId,
                    ProductName = product.Name,
                    Title = "Pricing Analysis",
                    Description = $"Current price: ₹{product.Price:N2}, Flipkart commission: {commissionRate}%, Net: ₹{netPrice:N2}",
                    ActionItems = new List<string>
                    {
                        "Compare with top 3 competitors on Flipkart",
                        "Consider psychological pricing (₹999 vs ₹1000)",
                        "Factor in shipping costs and return rates",
                        "Test price elasticity with Flipkart Ads"
                    },
                    ExpectedImpact = "Medium - Optimizes margin vs velocity tradeoff",
                    Confidence = 65,
                    EstimatedEffort = "Medium",
                    Metadata = new Dictionary<string, object>
                    {
                        ["currentPrice"] = product.Price,
                        ["commissionRate"] = commissionRate,
                        ["netPrice"] = netPrice,
                        ["recommendedAction"] = "Benchmark against competitors"
                    }
                });
            }
        }

        return suggestions;
    }

    private string GenerateSummary(List<FlipkartSuggestionDto> suggestions, FlipkartAssistanceType type)
    {
        if (suggestions.Count == 0)
            return "No suggestions generated. All products appear compliant.";

        var critical = suggestions.Count(s => s.Priority == FlipkartSuggestionPriority.Critical);
        var high = suggestions.Count(s => s.Priority == FlipkartSuggestionPriority.High);
        var byType = suggestions.GroupBy(s => s.Type).ToDictionary(g => g.Key, g => g.Count());

        return $"Flipkart {type} audit complete. {suggestions.Count} suggestions generated: {critical} critical, {high} high priority. Top areas: {string.Join(", ", byType.OrderByDescending(kvp => kvp.Value).Take(3).Select(kvp => kvp.Key))}.";
    }
}