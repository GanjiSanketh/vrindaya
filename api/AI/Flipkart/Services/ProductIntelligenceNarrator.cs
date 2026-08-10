using Microsoft.Extensions.Logging;
using Vrindaya.Api.AI.Core.Interfaces;
using Vrindaya.Api.AI.Core.Templates;
using Vrindaya.Api.AI.Flipkart.DTOs;
using Vrindaya.Api.AI.Flipkart.Models;

namespace Vrindaya.Api.AI.Flipkart.Services;

/// <summary>
/// Default <see cref="IProductIntelligenceNarrator"/>. Renders the managed
/// <see cref="PromptTemplateKind.ProductIntelligence"/> template with the
/// engine's computed metrics and routes it through the core
/// <see cref="IAiOrchestrator"/>, so the written analysis is real model output
/// when Gemini is active.
///
/// The prompt body lives in the template resource, not in this class — the
/// narrator only supplies the token values and never invents a metric.
/// </summary>
public sealed class ProductIntelligenceNarrator : IProductIntelligenceNarrator
{
    private readonly IPromptTemplateService _templates;
    private readonly IAiOrchestrator _orchestrator;
    private readonly ILogger<ProductIntelligenceNarrator> _logger;

    /// <summary>Telemetry label for prompts issued by this narrator.</summary>
    private const string ModuleName = "product-intelligence";

    /// <summary>Instruction keeping the answer grounded in the supplied metrics.</summary>
    private const string SystemInstruction =
        "You are a product intelligence analyst for Vrindaya, an Indian handmade ethnic apparel brand. " +
        "Answer in plain text using the numbered sections requested — no markdown tables, no preamble. " +
        "Ground every statement in the metrics supplied; never invent figures and never contradict the " +
        "recommended action given.";

    public ProductIntelligenceNarrator(
        IPromptTemplateService templates,
        IAiOrchestrator orchestrator,
        ILogger<ProductIntelligenceNarrator> logger)
    {
        _templates = templates ?? throw new ArgumentNullException(nameof(templates));
        _orchestrator = orchestrator ?? throw new ArgumentNullException(nameof(orchestrator));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public async Task<string> NarrateAsync(
        FlipkartProduct product,
        ProductIntelligenceResultDto analysis,
        CancellationToken cancellationToken = default)
    {
        if (product is null)
            throw new ArgumentNullException(nameof(product));

        if (analysis is null)
            throw new ArgumentNullException(nameof(analysis));

        cancellationToken.ThrowIfCancellationRequested();

        var values = new Dictionary<string, string>
        {
            ["product"] = product.Name,
            ["category"] = product.Category,
            ["price"] = $"{product.SellingPrice:N0} (cost {product.PurchaseCost:N0}, " +
                        $"margin {analysis.MarginPercentage:F1}%)",
            ["stock"] = $"{product.Stock} units ({analysis.StockHealth}), " +
                        $"velocity {analysis.SalesVelocity:F1}/day, " +
                        $"{DescribeCover(analysis.DaysOfInventory)}, risk {analysis.InventoryRisk}",
            ["lifecycleStage"] = $"score {analysis.OverallProductScore}/100, " +
                                 $"recommended action {analysis.RecommendedAction}",
        };

        var prompt = _templates.Render(PromptTemplateKind.ProductIntelligence, values);

        var analysisText = await _orchestrator.GenerateTextAsync(
            prompt, SystemInstruction, ModuleName, cancellationToken);

        if (string.IsNullOrWhiteSpace(analysisText))
        {
            _logger.LogInformation(
                "ProductIntelligenceNarrator: no analysis returned for '{ProductName}'.",
                product.Name);

            return string.Empty;
        }

        _logger.LogInformation(
            "ProductIntelligenceNarrator produced a {Characters}-character analysis for '{ProductName}' via {Provider}.",
            analysisText.Length,
            product.Name,
            _orchestrator.ActiveProviderName);

        return analysisText.Trim();
    }

    /// <summary>Describes remaining cover, which is undefined at zero velocity.</summary>
    private static string DescribeCover(double? daysOfInventory) =>
        daysOfInventory.HasValue
            ? $"{daysOfInventory.Value:F0} days of cover"
            : "no measurable cover (no sales yet)";
}
