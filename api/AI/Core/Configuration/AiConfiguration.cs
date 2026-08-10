using Microsoft.Extensions.Options;

namespace Vrindaya.Api.AI.Core.Configuration;

/// <summary>
/// Aggregate view over the AI module's options — provider selection plus one
/// settings block per concrete provider — so consumers read one consistent
/// configuration surface through a single <c>IOptions</c>-fed entry point.
///
/// Values are never hardcoded: everything is bound from appsettings.*.json /
/// environment variables via the individual Options classes, and this aggregate
/// only composes those already-resolved values. It deliberately performs no
/// provider *routing* (that decision belongs to <see cref="Interfaces.IAiProviderSelector"/>);
/// it only answers "what is configured" for the provider selection and for either
/// concrete provider's generation surface.
/// </summary>
public sealed class AiConfiguration
{
    private readonly IOptions<AiProviderSettings> _providerSettings;
    private readonly IOptions<GeminiSettings> _geminiSettings;
    private readonly IOptions<MockProviderSettings> _mockSettings;
    private readonly IOptions<AiCacheOptions> _cacheSettings;

    public AiConfiguration(
        IOptions<AiProviderSettings> providerSettings,
        IOptions<GeminiSettings> geminiSettings,
        IOptions<MockProviderSettings> mockSettings,
        IOptions<AiCacheOptions> cacheSettings)
    {
        _providerSettings = providerSettings ?? throw new ArgumentNullException(nameof(providerSettings));
        _geminiSettings = geminiSettings ?? throw new ArgumentNullException(nameof(geminiSettings));
        _mockSettings = mockSettings ?? throw new ArgumentNullException(nameof(mockSettings));
        _cacheSettings = cacheSettings ?? throw new ArgumentNullException(nameof(cacheSettings));
    }

    /// <summary>The provider the configuration requests, in enum form.</summary>
    public AiProviderType Provider => _providerSettings.Value.ResolvedProvider;

    /// <summary>The provider the configuration requests, as a string.</summary>
    public string ProviderName => _providerSettings.Value.Provider;

    /// <summary>Whether an unconfigured Gemini selection should fall back to the mock provider.</summary>
    public bool FallbackToMockWhenUnconfigured => _providerSettings.Value.FallbackToMockWhenUnconfigured;

    /// <summary>The Gemini provider's settings block.</summary>
    public GeminiSettings Gemini => _geminiSettings.Value;

    /// <summary>The mock provider's settings block.</summary>
    public MockProviderSettings Mock => _mockSettings.Value;

    /// <summary>The AI response-cache settings block.</summary>
    public AiCacheOptions Cache => _cacheSettings.Value;

    /// <summary>
    /// The generation surface (model, temperature, max tokens, timeout) for a
    /// concrete provider type. Unknown types resolve to the mock provider's
    /// block, mirroring the enum's own safe fallback.
    /// </summary>
    public AiGenerationSettings ForProvider(AiProviderType providerType) =>
        providerType switch
        {
            AiProviderType.Gemini => new AiGenerationSettings(
                Gemini.Model,
                Gemini.Temperature,
                Gemini.MaxOutputTokens,
                Gemini.EffectiveTimeoutSeconds),
            _ => new AiGenerationSettings(
                Mock.Model,
                Mock.Temperature,
                Mock.MaxOutputTokens,
                Mock.EffectiveTimeoutSeconds),
        };
}

/// <summary>
/// Immutable generation surface shared by every provider configuration. Keeps
/// "model / temperature / max tokens / timeout" a single, comparable shape so
/// consumers and diagnostics never branch on provider-specific property names.
/// </summary>
public sealed record AiGenerationSettings(
    string Model,
    double Temperature,
    int MaxOutputTokens,
    int TimeoutSeconds);