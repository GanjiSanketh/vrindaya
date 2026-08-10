using Vrindaya.Api.AI.Core.Templates;

namespace Vrindaya.Api.AI.Core.Interfaces;

/// <summary>
/// Manages the AI module's reusable prompt templates — campaign, Flipkart,
/// Instagram, Reels, Carousel and Product Intelligence — so services never embed
/// prompt strings in code. Templates are loaded once from embedded resources
/// (with optional per-kind configuration overrides) and rendered with a supplied
/// token map.
///
/// Rendering is a pure string substitution (<c>{{name}}</c> → value); any token
/// without a supplied value renders as an empty string.
/// </summary>
public interface IPromptTemplateService
{
    /// <summary>
    /// Returns the template for a kind, or null when no template is available
    /// (neither embedded nor configured).
    /// </summary>
    PromptTemplate? Get(PromptTemplateKind kind);

    /// <summary>Returns every loaded template.</summary>
    IReadOnlyList<PromptTemplate> GetAll();

    /// <summary>
    /// Renders a template's body by substituting the supplied token values in
    /// place of the matching <c>{{placeholder}}</c> tokens.
    /// </summary>
    /// <param name="kind">The template to render.</param>
    /// <param name="values">Token name → value map. Tokens with no value render as empty.</param>
    /// <returns>The fully substituted prompt body.</returns>
    /// <exception cref="KeyNotFoundException">No template is available for <paramref name="kind"/>.</exception>
    string Render(PromptTemplateKind kind, IReadOnlyDictionary<string, string> values);
}