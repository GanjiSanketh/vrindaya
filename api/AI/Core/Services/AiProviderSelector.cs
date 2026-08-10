using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Vrindaya.Api.AI.Core.Configuration;
using Vrindaya.Api.AI.Core.Interfaces;
using Vrindaya.Api.AI.Core.Providers;
using Vrindaya.Api.AI.Core.Providers.Gemini;

namespace Vrindaya.Api.AI.Core.Services;

/// <summary>
/// Default <see cref="IAiProviderSelector"/>. Maps the configured
/// <see cref="AiProviderType"/> onto a concrete provider instance, and applies
/// the one safety rule the platform needs: selecting Gemini without an API key
/// degrades to the mock provider instead of failing every AI request.
///
/// Both concrete providers are injected, so selection is a lookup rather than a
/// service-locator call, and the decision lives in exactly one type.
/// </summary>
public sealed class AiProviderSelector : IAiProviderSelector
{
    private readonly MockAiProvider _mockProvider;
    private readonly GeminiAiProvider _geminiProvider;
    private readonly IOptions<AiProviderSettings> _providerSettings;
    private readonly IOptions<GeminiSettings> _geminiSettings;
    private readonly ILogger<AiProviderSelector> _logger;

    public AiProviderSelector(
        MockAiProvider mockProvider,
        GeminiAiProvider geminiProvider,
        IOptions<AiProviderSettings> providerSettings,
        IOptions<GeminiSettings> geminiSettings,
        ILogger<AiProviderSelector> logger)
    {
        _mockProvider = mockProvider ?? throw new ArgumentNullException(nameof(mockProvider));
        _geminiProvider = geminiProvider ?? throw new ArgumentNullException(nameof(geminiProvider));
        _providerSettings = providerSettings ?? throw new ArgumentNullException(nameof(providerSettings));
        _geminiSettings = geminiSettings ?? throw new ArgumentNullException(nameof(geminiSettings));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public AiProviderType ConfiguredProvider => _providerSettings.Value.ResolvedProvider;

    public AiProviderType ActiveProvider
    {
        get
        {
            var configured = ConfiguredProvider;

            if (configured != AiProviderType.Gemini)
            {
                return configured;
            }

            var hasApiKey = !string.IsNullOrWhiteSpace(_geminiSettings.Value.ApiKey);

            if (hasApiKey || !_providerSettings.Value.FallbackToMockWhenUnconfigured)
            {
                return AiProviderType.Gemini;
            }

            _logger.LogWarning(
                "AI provider 'Gemini' is configured but no API key is present — falling back to the mock provider.");

            return AiProviderType.Mock;
        }
    }

    public IAiProvider Resolve() => Resolve(ActiveProvider);

    public IAiProvider Resolve(AiProviderType providerType) =>
        providerType switch
        {
            AiProviderType.Gemini => _geminiProvider,
            _ => _mockProvider,
        };
}
