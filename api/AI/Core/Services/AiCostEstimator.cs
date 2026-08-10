using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Vrindaya.Api.AI.Core.Configuration;
using Vrindaya.Api.AI.Core.Interfaces;
using Vrindaya.Api.AI.Core.Models;

namespace Vrindaya.Api.AI.Core.Services;

/// <summary>
/// Default <see cref="IAiCostEstimator"/>. Pure configuration-driven estimator:
/// it reads per-token pricing from <see cref="GeminiSettings"/> (the only provider
/// with a configured model and rates) and treats every other provider — including
/// the mock provider — as zero-cost, since they make no external API calls.
///
/// Token counts are either supplied by the caller (provider-reported) or
/// approximated from content length via <see cref="AiTokenEstimator"/> (the
/// ~4 characters per token heuristic). Cost is then computed from the configured
/// per-1,000,000-token list prices. No network call is ever made.
/// </summary>
public sealed class AiCostEstimator : IAiCostEstimator
{
    private const int TokensPerMillion = 1_000_000;
    private const int CostDecimals = 6;

    private readonly IOptions<GeminiSettings> _geminiSettings;
    private readonly ILogger<AiCostEstimator> _logger;

    public AiCostEstimator(
        IOptions<GeminiSettings> geminiSettings,
        ILogger<AiCostEstimator> logger)
    {
        _geminiSettings = geminiSettings ?? throw new ArgumentNullException(nameof(geminiSettings));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public AiCostEstimate Estimate(
        AiProviderType provider,
        string model,
        int promptTokens,
        int responseTokens,
        bool tokensEstimated = false)
    {
        var (inputPrice, outputPrice) = ResolvePrices(provider);
        var cost = ComputeCost(promptTokens, responseTokens, inputPrice, outputPrice);

        _logger.LogDebug(
            "AI cost estimate: provider {Provider}, model {Model}, prompt tokens {PromptTokens}, " +
            "response tokens {ResponseTokens}, estimated cost {CostUsd} USD.",
            provider, model, promptTokens, responseTokens, cost);

        return new AiCostEstimate
        {
            Provider = provider,
            Model = model,
            PromptTokens = promptTokens,
            ResponseTokens = responseTokens,
            TokensEstimated = tokensEstimated,
            InputTokenPricePerMillion = inputPrice,
            OutputTokenPricePerMillion = outputPrice,
            EstimatedCostUsd = cost,
        };
    }

    public AiCostEstimate EstimateFromContent(
        AiProviderType provider,
        string model,
        string prompt,
        string? response = null)
    {
        var promptTokens = AiTokenEstimator.Estimate(prompt);
        var responseTokens = AiTokenEstimator.Estimate(response);

        return Estimate(provider, model, promptTokens, responseTokens, tokensEstimated: true);
    }

    /// <summary>
    /// Resolves the per-1,000,000-token prices for a provider. Only Gemini carries
    /// real rates; any other provider (including Mock) is zero-cost.
    /// </summary>
    private (decimal input, decimal output) ResolvePrices(AiProviderType provider)
    {
        if (provider == AiProviderType.Gemini)
        {
            var gemini = _geminiSettings.Value;
            return (gemini.InputTokenPricePerMillion, gemini.OutputTokenPricePerMillion);
        }

        return (0m, 0m);
    }

    /// <summary>
    /// Computes the estimated USD cost from token counts and per-million prices.
    /// </summary>
    private static decimal ComputeCost(
        int promptTokens,
        int responseTokens,
        decimal inputPricePerMillion,
        decimal outputPricePerMillion)
    {
        var promptCost = (decimal)promptTokens / TokensPerMillion * inputPricePerMillion;
        var responseCost = (decimal)responseTokens / TokensPerMillion * outputPricePerMillion;

        return Math.Round(promptCost + responseCost, CostDecimals);
    }
}
