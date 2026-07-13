using Google.Apis.Auth.OAuth2;
using Vrindaya.Api.Configuration;

namespace Vrindaya.Api.Services;

/// <summary>
/// Resolves the Firebase service account credential from FirebaseOptions —
/// ServiceAccountJson if present, otherwise a file at ServiceAccountPath.
/// Kept separate from FirebaseService so that class stays focused purely
/// on turning a credential into a FirestoreDb. No environment-name checks
/// live here (or anywhere in this path) — which source to use is decided
/// entirely by which option is populated, not by ASPNETCORE_ENVIRONMENT.
/// Internal: this is infrastructure plumbing for FirebaseService, not a
/// service other code should depend on directly.
/// </summary>
internal static class FirebaseCredentialProvider
{
    public static ServiceAccountCredential GetCredential(FirebaseOptions options, IWebHostEnvironment environment)
    {
        if (!string.IsNullOrWhiteSpace(options.ServiceAccountJson))
        {
            return LoadFromJson(options.ServiceAccountJson);
        }

        if (string.IsNullOrWhiteSpace(options.ServiceAccountPath))
        {
            throw new InvalidOperationException(
                "Firebase credentials have not been configured. Set Firebase:ServiceAccountPath " +
                "(a local service account key file) or the FIREBASE_SERVICE_ACCOUNT_JSON environment " +
                "variable (the key's full JSON contents).");
        }

        return LoadFromFile(options.ServiceAccountPath, environment);
    }

    private static ServiceAccountCredential LoadFromJson(string json)
    {
        try
        {
            // CredentialFactory + ToGoogleCredential() is the non-deprecated
            // replacement for GoogleCredential.FromJson(), which is obsolete
            // ("potential security risk") as of the installed Google.Apis.Auth
            // version.
            return CredentialFactory.FromJson<ServiceAccountCredential>(json);
        }
        catch (Exception ex)
        {
            throw new InvalidOperationException("Invalid Firebase service account JSON.", ex);
        }
    }

    private static ServiceAccountCredential LoadFromFile(string configuredPath, IWebHostEnvironment environment)
    {
        var resolvedPath = Path.IsPathRooted(configuredPath)
            ? configuredPath
            : Path.Combine(environment.ContentRootPath, configuredPath);

        if (!File.Exists(resolvedPath))
        {
            throw new InvalidOperationException(
                $"Firebase service account file was not found. Expected it at '{resolvedPath}'.");
        }

        // CredentialFactory + ToGoogleCredential() is the non-deprecated
        // replacement for GoogleCredential.FromFile(), which is obsolete
        // ("potential security risk") as of the installed Google.Apis.Auth
        // version.
        return CredentialFactory.FromFile<ServiceAccountCredential>(resolvedPath);
    }
}
