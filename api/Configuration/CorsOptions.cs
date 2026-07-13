namespace Vrindaya.Api.Configuration;

/// <summary>
/// Strongly typed binding for the "Cors" configuration section.
/// Keeps the allowed origins list environment-specific instead of hardcoded.
/// </summary>
public class CorsOptions
{
    public const string SectionName = "Cors";

    public string[] AllowedOrigins { get; set; } = [];
}
