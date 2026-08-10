using Vrindaya.Api.AI.Core.Configuration;
using Vrindaya.Api.AI.Core.Models;

namespace Vrindaya.Api.AI.Core.Interfaces;

/// <summary>
/// Estimates the token usage and API cost of an AI operation from locally held
/// configuration — no external API is called. Two entry points:
/// <list type="bullet">
///   <item>
///     <see cref="Estimate(AiProviderType,string,int,int,bool)"/> accepts known
///     token counts (e.g. provider-reported usage);</item>
///   <item>
///     <see cref="EstimateFromContent(AiProviderType,string,string,string?)"/>
///     derives token counts from prompt/response text using the shared
///     character-length heuristic, then prices the result.</item>
/// </list>
/// The mock provider is treated as zero-cost (no external API); only configured
/// Gemini pricing carries a charge.
/// </summary>
public interface IAiCostEstimator
{
    /// <summary>
    /// Prices an operation from explicit token counts.
    /// </summary>
    /// <param name="provider">Provider the request ran against.</param>
    /// <param name="model">Model the request ran against, e.g. "gemini-1.5-flash".</param>
    /// <param name="promptTokens">Input (prompt) token count.</param>
    /// <param name="responseTokens">Output (response) token count.</param>
    /// <param name="tokensEstimated">True when the token counts are approximations rather than provider-reported values.</param>
    /// <returns>A strongly typed cost/token estimate.</returns>
    AiCostEstimate Estimate(
        AiProviderType provider,
        string model,
        int promptTokens,
        int responseTokens,
        bool tokensEstimated = false);

    /// <summary>
    /// Prices an operation by first estimating its token counts from content
    /// length, then applying configured per-provider pricing.
    /// </summary>
    /// <param name="provider">Provider the request ran against.</param>
    /// <param name="model">Model the request ran against, e.g. "gemini-1.5-flash".</param>
    /// <param name="prompt">The prompt text to estimate input tokens from.</param>
    /// <param name="response">Optional response text to estimate output tokens from.</param>
    /// <returns>A strongly typed cost/token estimate with <see cref="AiCostEstimate.TokensEstimated"/> set.</returns>
    AiCostEstimate EstimateFromContent(
        AiProviderType provider,
        string model,
        string prompt,
        string? response = null);
}
