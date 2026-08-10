namespace Vrindaya.Api.AI.Core.Models;

public sealed class AiDiagnosticsOverviewDto
{
    public string Provider { get; init; } = string.Empty;

    public string Model { get; init; } = string.Empty;

    public int PromptTemplateCount { get; init; }

    public IReadOnlyList<string> RegisteredModules { get; init; } = Array.Empty<string>();

    public bool IsHealthy { get; init; }

    public bool IsConfigurationValid { get; init; }

    public bool IsPricingLoaded { get; init; }

    public AiUsageSummary Usage { get; init; } = new();

    public AiCostEstimate Cost { get; init; } = new();

    public DateTime GeneratedAt { get; init; } = DateTime.UtcNow;
}
