using Vrindaya.Api.AI.Core.Configuration;

namespace Vrindaya.Api.AI.Core.Models;

/// <summary>
/// Strongly typed estimate of the token usage and API cost for a single AI
/// operation, returned by <see cref="Interfaces.IAiCostEstimator"/>.
///
/// Values are estimates, not billing records: token counts are either
/// provider-reported or approximated from content length, and cost is derived
/// from configuration-driven per-1,000,000-token list prices. No external API is
/// called to produce this — it is pure arithmetic over locally held configuration,
/// so it is safe to compute for any request regardless of provider.
/// </summary>
public sealed class AiCostEstimate
{
    /// <summary>Provider attributed to the estimate.</summary>
    public AiProviderType Provider { get; init; }

    /// <summary>Model attributed to the estimate (e.g. "gemini-1.5-flash").</summary>
    public string Model { get; init; } = string.Empty;

    /// <summary>Estimated input (prompt) token count.</summary>
    public int PromptTokens { get; init; }

    /// <summary>Estimated output (response) token count.</summary>
    public int ResponseTokens { get; init; }

    /// <summary>Total estimated tokens attributable to the operation.</summary>
    public int TotalTokens => PromptTokens + ResponseTokens;

    /// <summary>True when the token counts are approximations rather than provider-reported values.</summary>
    public bool TokensEstimated { get; init; }

    /// <summary>Input token price used, USD per 1,000,000 tokens.</summary>
    public decimal InputTokenPricePerMillion { get; init; }

    /// <summary>Output token price used, USD per 1,000,000 tokens.</summary>
    public decimal OutputTokenPricePerMillion { get; init; }

    /// <summary>Estimated API cost in USD.</summary>
    public decimal EstimatedCostUsd { get; init; }

    /// <summary>ISO currency code of the estimate.</summary>
    public string Currency { get; init; } = "USD";
}
