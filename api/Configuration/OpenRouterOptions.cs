namespace Vrindaya.Api.Configuration;

/// <summary>
/// Strongly typed binding for the "OpenRouter" configuration section. Real
/// values are supplied via environment variables (OpenRouter__ApiKey,
/// OpenRouter__Model, OpenRouter__BaseUrl, OpenRouter__Timeout — see
/// docs/setup/environment-variables.md), never committed to appsettings.*.json.
/// ApiKey must never be logged or returned in any API response.
/// </summary>
public class OpenRouterOptions
{
    public const string SectionName = "OpenRouter";

    public string ApiKey { get; set; } = string.Empty;
    public string Model { get; set; } = string.Empty;
    public string BaseUrl { get; set; } = string.Empty;
    public int Timeout { get; set; }
}
