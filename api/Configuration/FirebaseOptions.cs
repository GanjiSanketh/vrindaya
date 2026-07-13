namespace Vrindaya.Api.Configuration;

/// <summary>
/// Strongly typed binding for the "Firebase" configuration section.
/// Populated via appsettings or environment variables (Firebase__ProjectId, etc.).
/// No token validation is implemented yet — see TokenValidationMiddleware.
/// </summary>
public class FirebaseOptions
{
    public const string SectionName = "Firebase";

    public string ProjectId { get; set; } = string.Empty;
    public string ClientEmail { get; set; } = string.Empty;
    public string PrivateKey { get; set; } = string.Empty;
}
