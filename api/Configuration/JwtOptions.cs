namespace Vrindaya.Api.Configuration;

/// <summary>
/// Strongly typed binding for the "Jwt" configuration section.
/// Populated via appsettings or environment variables (Jwt__SecretKey, etc.).
/// </summary>
public class JwtOptions
{
    public const string SectionName = "Jwt";

    public string Issuer { get; set; } = string.Empty;
    public string Audience { get; set; } = string.Empty;
    public string SecretKey { get; set; } = string.Empty;
    public int ExpiryMinutes { get; set; } = 60;
}
