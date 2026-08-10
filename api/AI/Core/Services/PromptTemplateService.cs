using System.Reflection;
using System.Text;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Vrindaya.Api.AI.Core.Interfaces;
using Vrindaya.Api.AI.Core.Templates;

namespace Vrindaya.Api.AI.Core.Services;

/// <summary>
/// Default <see cref="IPromptTemplateService"/>. Loads prompt templates from
/// embedded <c>.prompt.txt</c> resources shipped with the assembly (one file per
/// <see cref="PromptTemplateKind"/>) and applies optional overrides from the
/// <c>AI:Templates:{Kind}</c> configuration section.
///
/// Templates are read once at startup into an immutable map, so services hold no
/// prompt strings in code and copy changes are a config/asset change, not a code
/// change. Loading is best-effort per kind: a missing embedded resource for one
/// kind does not fail the whole service.
/// </summary>
public sealed class PromptTemplateService : IPromptTemplateService
{
    private readonly IReadOnlyDictionary<PromptTemplateKind, PromptTemplate> _templates;
    private readonly ILogger<PromptTemplateService> _logger;

    /// <summary>Matches the {{name}} placeholders used across template bodies.</summary>
    private static readonly Regex PlaceholderPattern = new(@"\{\{\s*(?<name>[A-Za-z0-9_]+)\s*\}\}", RegexOptions.Compiled);

    /// <summary>Configuration path where per-kind template overrides live.</summary>
    private const string OverridesSection = "AI:Templates";

    /// <summary>
    /// Suffix every embedded template resource is named with, e.g.
    /// "...Templates.Embedded.{Kind}.prompt.txt". Resources are located by this
    /// suffix rather than a hardcoded assembly/namespace name, so the exact
    /// logical name chosen by MSBuild never matters.
    /// </summary>
    private static string EmbeddedResourceSuffix(PromptTemplateKind kind) => $".Templates.Embedded.{kind}.prompt.txt";

    public PromptTemplateService(IConfiguration configuration, ILogger<PromptTemplateService> logger)
    {
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));

        var loaded = new Dictionary<PromptTemplateKind, PromptTemplate>();

        foreach (var kind in Enum.GetValues<PromptTemplateKind>())
        {
            var template = LoadTemplate(kind, configuration);
            if (template is not null)
            {
                loaded[kind] = template;
            }
        }

        _templates = loaded;

        if (_templates.Count == 0)
        {
            _logger.LogWarning(
                "PromptTemplateService loaded no templates — check that the .prompt.txt embedded resources are present.");
        }
        else
        {
            _logger.LogInformation(
                "PromptTemplateService loaded {Count} prompt template(s): {Kinds}.",
                _templates.Count, string.Join(", ", _templates.Values.Select(t => t.Kind)));
        }
    }

    public PromptTemplate? Get(PromptTemplateKind kind) =>
        _templates.TryGetValue(kind, out var template) ? template : null;

    public IReadOnlyList<PromptTemplate> GetAll() => _templates.Values.ToList();

    public string Render(PromptTemplateKind kind, IReadOnlyDictionary<string, string> values)
    {
        var template = Get(kind)
            ?? throw new KeyNotFoundException($"No prompt template is available for kind '{kind}'.");

        return PlaceholderPattern.Replace(template.Body, match =>
        {
            var name = match.Groups["name"].Value;
            return values.TryGetValue(name, out var value) ? value : string.Empty;
        });
    }

    /// <summary>
    /// Loads a single template: configuration override wins when present;
    /// otherwise the embedded <c>{Kind}.prompt.txt</c> resource is read.
    /// </summary>
    private PromptTemplate? LoadTemplate(PromptTemplateKind kind, IConfiguration configuration)
    {
        // 1. Configuration override (e.g. AI:Templates:Campaign:Body). Empty
        //    bodies are ignored so a null/removed section falls through to embedded.
        var section = configuration.GetSection($"{OverridesSection}:{kind}");
        var configuredBody = section["Body"];
        if (!string.IsNullOrWhiteSpace(configuredBody))
        {
            return BuildTemplate(kind, kind.ToString(), configuredBody!, "configuration");
        }

        // 2. Embedded resource, one file per kind under Templates/Embedded.
        var suffix = EmbeddedResourceSuffix(kind);
        var body = ReadEmbeddedResource(suffix);

        if (body is null)
        {
            _logger.LogWarning(
                "PromptTemplateService: no template for kind {Kind} (missing embedded resource ending in {Suffix}).",
                kind, suffix);
            return null;
        }

        return BuildTemplate(kind, kind.ToString(), body, "embedded");
    }

    private PromptTemplate BuildTemplate(PromptTemplateKind kind, string name, string body, string source)
    {
        var trimmed = body.Trim();
        var placeholders = PlaceholderPattern.Matches(trimmed)
            .Select(m => m.Groups["name"].Value)
            .Distinct(StringComparer.Ordinal)
            .ToList();

        return new PromptTemplate
        {
            Kind = kind,
            Name = name,
            Body = trimmed,
            Placeholders = placeholders,
            Source = source,
        };
    }

    private string? ReadEmbeddedResource(string suffix)
    {
        var assembly = Assembly.GetExecutingAssembly();
        var resourceName = assembly.GetManifestResourceNames()
            .FirstOrDefault(n => n.EndsWith(suffix, StringComparison.Ordinal));

        if (resourceName is null)
        {
            return null;
        }

        using var stream = assembly.GetManifestResourceStream(resourceName);
        if (stream is null)
        {
            return null;
        }

        using var reader = new StreamReader(stream, Encoding.UTF8);
        return reader.ReadToEnd();
    }
}