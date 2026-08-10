namespace Vrindaya.Api.Configuration;

/// <summary>
/// Strongly typed binding for the "Gemini" configuration section. Real
/// values are supplied via environment variables (Gemini__ApiKey,
/// Gemini__Model, Gemini__BaseUrl, Gemini__Timeout), never committed to
/// appsettings.*.json. ApiKey must never be logged or returned in any API
/// response.
/// </summary>
public class GeminiOptions
{
    public const string SectionName = "Gemini";

    public string ApiKey { get; set; } = string.Empty;
    public string Model { get; set; } = string.Empty;
    public string BaseUrl { get; set; } = string.Empty;
    public int Timeout { get; set; }
}