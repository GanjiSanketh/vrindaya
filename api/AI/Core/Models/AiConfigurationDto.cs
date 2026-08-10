using Vrindaya.Api.AI.Core.Configuration;

namespace Vrindaya.Api.AI.Core.Models;

public sealed class AiConfigurationDto
{
    public AiProviderType Provider { get; init; }

    public string ProviderName { get; init; } = string.Empty;

    public string Model { get; init; } = string.Empty;

    public double Temperature { get; init; }

    public int MaxTokens { get; init; }

    public int TimeoutSeconds { get; init; }

    public bool IsMockModeEnabled { get; init; }

    public AiPricingDto Pricing { get; init; } = new();

    public DateTime GeneratedAt { get; init; } = DateTime.UtcNow;
}

public sealed class AiPricingDto
{
    public decimal InputTokenPricePerMillion { get; init; }

    public decimal OutputTokenPricePerMillion { get; init; }

    public string Currency { get; init; } = "USD";
}
