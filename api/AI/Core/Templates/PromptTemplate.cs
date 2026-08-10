namespace Vrindaya.Api.AI.Core.Templates;

/// <summary>
/// A reusable prompt template: a named body of text with positional
/// <c>{{placeholder}}</c> tokens that <see cref="IPromptTemplateService"/>
/// substitutes at render time.
///
/// Templates are data — they are loaded from embedded resources or configuration
/// and never compiled into a service, so copy changes do not require redeploys
/// of the AI module code.
/// </summary>
public sealed class PromptTemplate
{
    /// <summary>Which prompt family this template belongs to.</summary>
    public required PromptTemplateKind Kind { get; init; }

    /// <summary>Human-readable template name, e.g. "Campaign Plan".</summary>
    public required string Name { get; init; }

    /// <summary>
    /// Template body containing <c>{{placeholder}}</c> tokens. Leading/trailing
    /// blank lines are trimmed at load time so embedded files stay readable.
    /// </summary>
    public required string Body { get; init; }

    /// <summary>Distinct placeholders referenced by the body, in first-appearance order.</summary>
    public required IReadOnlyList<string> Placeholders { get; init; }

    /// <summary>Where the template was loaded from: "embedded" or "configuration".</summary>
    public required string Source { get; init; }

    /// <summary>Returns a human-readable summary for logs and diagnostics.</summary>
    public override string ToString() =>
        $"{Name} ({Kind}) — {Placeholders.Count} placeholder(s), from {Source}";
}