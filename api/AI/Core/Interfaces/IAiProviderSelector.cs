using Vrindaya.Api.AI.Core.Configuration;

namespace Vrindaya.Api.AI.Core.Interfaces;

/// <summary>
/// Single place where "which AI provider serves this request?" is decided.
/// Reads the "AI:Provider" configuration through <see cref="AiProviderSettings"/> and
/// resolves the matching <see cref="IAiProvider"/> registration.
///
/// Every consumer — orchestrator, services, controllers — depends on this
/// abstraction (or on <see cref="IAiProvider"/> directly) and therefore never
/// contains a switch over provider names.
/// </summary>
public interface IAiProviderSelector
{
    /// <summary>The provider type the configuration asked for.</summary>
    AiProviderType ConfiguredProvider { get; }

    /// <summary>
    /// The provider actually serving requests. Differs from
    /// <see cref="ConfiguredProvider"/> when the requested provider is not
    /// usable (e.g. Gemini selected with no API key) and the mock fallback
    /// applies.
    /// </summary>
    AiProviderType ActiveProvider { get; }

    /// <summary>Resolves the active provider implementation.</summary>
    IAiProvider Resolve();

    /// <summary>Resolves a specific provider implementation by type.</summary>
    /// <param name="providerType">The provider to resolve.</param>
    IAiProvider Resolve(AiProviderType providerType);
}
