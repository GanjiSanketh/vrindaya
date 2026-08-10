namespace Vrindaya.Api.AI.Core.Configuration;

/// <summary>
/// Identifies which <see cref="Interfaces.IAiProvider"/> implementation should
/// serve AI requests. Bound from the "AI:Provider" configuration value.
/// </summary>
public enum AiProviderType
{
    /// <summary>Deterministic in-process provider — no external API calls.</summary>
    Mock = 0,

    /// <summary>Google Gemini generateContent provider.</summary>
    Gemini = 1,
}

/// <summary>
/// Strongly typed binding for the AI module's provider-selection configuration.
/// Values come from appsettings.*.json under "AI", overridable by environment
/// variables using the standard double-underscore convention (AI__Provider).
///
/// Provider selection is expressed here as data, so no consumer — controller,
/// service or engine — needs a switch over provider names.
/// </summary>
public class AiProviderSettings
{
    public const string SectionName = "AI";

    /// <summary>
    /// Requested provider name, e.g. "Mock" or "Gemini". Parsed
    /// case-insensitively; an unknown or blank value resolves to
    /// <see cref="AiProviderType.Mock"/>.
    /// </summary>
    public string Provider { get; set; } = nameof(AiProviderType.Mock);

    /// <summary>
    /// When true (the default), selecting Gemini without a configured API key
    /// falls back to the mock provider instead of failing requests.
    /// </summary>
    public bool FallbackToMockWhenUnconfigured { get; set; } = true;

    /// <summary>
    /// The configured provider resolved to its enum form. Unknown values fall
    /// back to <see cref="AiProviderType.Mock"/> rather than throwing, so a
    /// configuration typo degrades to the safe provider.
    /// </summary>
    public AiProviderType ResolvedProvider =>
        Enum.TryParse<AiProviderType>(Provider, ignoreCase: true, out var parsed)
            ? parsed
            : AiProviderType.Mock;
}
