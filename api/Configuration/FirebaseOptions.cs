namespace Vrindaya.Api.Configuration;

/// <summary>
/// Strongly typed binding for the "Firebase" configuration section.
/// No token validation is implemented yet — see TokenValidationMiddleware.
/// </summary>
public class FirebaseOptions
{
    public const string SectionName = "Firebase";

    /// <summary>
    /// Path (relative to the app's content root, unless rooted) to the
    /// service account key file — local development. Ignored when
    /// ServiceAccountJson is set.
    /// </summary>
    public string? ServiceAccountPath { get; set; }

    /// <summary>
    /// The service account key's full JSON contents — production. Bound
    /// from the FIREBASE_SERVICE_ACCOUNT_JSON environment variable (see
    /// ServiceCollectionExtensions.AddApplicationOptions); takes priority
    /// over ServiceAccountPath when present.
    /// </summary>
    public string? ServiceAccountJson { get; set; }
}
