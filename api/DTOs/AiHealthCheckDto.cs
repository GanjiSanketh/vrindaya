using Vrindaya.Api.AI.Core.Models;

namespace Vrindaya.Api.DTOs;

/// <summary>
/// Response shape for GET /api/v1/ai/health. Reports the active provider plus
/// capability/configuration details for the registered AI provider candidates.
/// </summary>
public class AiHealthCheckDto
{
    /// <summary>Name of the provider currently selected to serve AI requests.</summary>
    public string CurrentProvider { get; set; } = string.Empty;

    /// <summary>Value of the "AI:Provider" configuration key (which provider was requested).</summary>
    public string ConfiguredProvider { get; set; } = string.Empty;

    /// <summary>Gemini model name from the "AI:Gemini:Model" configuration.</summary>
    public string Model { get; set; } = string.Empty;

    /// <summary>Capability/status details for the deterministic mock provider.</summary>
    public AiProviderHealthDto MockAiProvider { get; set; } = new();

    /// <summary>Capability/status details for the Gemini provider.</summary>
    public AiProviderHealthDto GeminiAiProvider { get; set; } = new();

    /// <summary>Health status of the currently active provider.</summary>
    public AiProviderHealthStatus Health { get; set; } = new();

    public string Version { get; set; } = string.Empty;

    /// <summary>Wall-clock response time of the health probe, in milliseconds.</summary>
    public long ResponseTimeMs { get; set; }
}

/// <summary>
/// Per-provider capability summary used by <see cref="AiHealthCheckDto"/>. No
/// external API is contacted to fill these fields — they are derived from DI
/// registration and local configuration state.
/// </summary>
public class AiProviderHealthDto
{
    public string Name { get; set; } = string.Empty;

    /// <summary>True when this provider is the one serving AI requests.</summary>
    public bool IsActive { get; set; }

    /// <summary>True when the provider is registered in dependency injection.</summary>
    public bool IsRegistered { get; set; }

    /// <summary>True when this provider is a mock (no external API calls).</summary>
    public bool IsMock { get; set; }

    /// <summary>True when this provider's required configuration is present.</summary>
    public bool IsConfigured { get; set; }
}